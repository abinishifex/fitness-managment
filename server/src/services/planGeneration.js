const {
  MemberProfile,
  Exercise,
  WorkoutPlan,
} = require('../database/models');
const { generateCandidatePlan } = require('./rulesEngine');
const {
  buildRulesOnlyPlan,
  FALLBACK_REASON,
  runDecisionWithFallback,
} = require('../ai/fallbackPlan');
const { createMockProvider } = require('../ai');
const { validatePlan } = require('../safety/safetyValidator');

function safetyContext(profile, training, weeklyVolumeTarget, catalog) {
  return {
    catalog,
    equipmentAvailable: profile.equipmentAvailable || [],
    limitations: profile.limitations || [],
    sessionDurationMinutes: training.sessionDurationMinutes,
    trainingExperience: training.trainingExperience,
    weeklyVolumeTarget,
  };
}

function sameDay(left, right) {
  return String(left).toLowerCase() === String(right).toLowerCase();
}

function prescriptionFromAdjustment(adjustment) {
  return {
    sets: adjustment.sets,
    reps: adjustment.reps,
    rpe: adjustment.rpe,
    restSeconds: adjustment.restSeconds,
  };
}

function mergeAiAdjustments(candidate, adjustments = []) {
  const days = (candidate.days || []).map((day) => ({
    ...day,
    exercises: (day.exercises || []).map((exercise) => ({ ...exercise })),
  }));

  for (const adjustment of adjustments) {
    const day = days.find((item) => sameDay(item.dayOfWeek, adjustment.dayOfWeek));
    if (!day) continue;

    const exerciseIndex = day.exercises.findIndex((exercise) =>
      String(exercise.exerciseId) === String(adjustment.exerciseId)
    );

    if (adjustment.action === 'KEEP') {
      if (exerciseIndex === -1) continue;
      day.exercises[exerciseIndex] = {
        ...day.exercises[exerciseIndex],
        ...prescriptionFromAdjustment(adjustment),
        action: 'KEEP',
      };
    } else if (adjustment.action === 'SWAP') {
      if (exerciseIndex === -1) continue;
      day.exercises[exerciseIndex] = {
        ...day.exercises[exerciseIndex],
        exerciseId: adjustment.replaceExerciseId,
        ...prescriptionFromAdjustment(adjustment),
        action: 'SWAP',
      };
    } else if (adjustment.action === 'ADD') {
      const alreadyPresent = day.exercises.some((exercise) =>
        String(exercise.exerciseId) === String(adjustment.exerciseId)
      );
      if (!alreadyPresent) {
        day.exercises.push({
          exerciseId: adjustment.exerciseId,
          action: 'ADD',
          ...prescriptionFromAdjustment(adjustment),
        });
      }
    } else if (adjustment.action === 'REMOVE' && exerciseIndex !== -1) {
      day.exercises.splice(exerciseIndex, 1);
    }
  }

  return {
    ...candidate,
    days,
  };
}

async function loadExerciseCatalog(plan) {
  const ids = [
    ...new Set(
      (plan.days || []).flatMap((day) =>
        (day.exercises || []).map((exercise) => String(exercise.exerciseId))
      )
    ),
  ];

  return Exercise.find({ _id: { $in: ids } }).lean();
}

function shouldUseMockAi() {
  // Only when explicitly requested — do not hide live provider failures in tests.
  return process.env.AI_PROVIDER === 'mock';
}

function defaultPlanName(splitType, trainingDaysPerWeek, index) {
  const split = String(splitType || 'plan').replaceAll('_', ' ');
  const label = split.replace(/\b\w/g, (c) => c.toUpperCase());
  return `${label} · ${trainingDaysPerWeek}d` + (index > 1 ? ` #${index}` : '');
}

/**
 * @param {string} userId
 * @param {{
 *   name?: string,
 *   select?: boolean,
 *   replacePlanId?: string,
 *   fitnessGoal?: string,
 *   trainingExperience?: string,
 *   trainingDaysPerWeek?: number,
 *   priorityMuscleGroup?: string,
 *   sessionDurationMinutes?: number,
 * }} [options]
 */
async function generateWorkoutPlan(userId, options = {}) {
  const profile = await MemberProfile.findOne({ userId });
  if (!profile) {
    const error = new Error('Member profile not found');
    error.status = 404;
    throw error;
  }

  const profileLean = typeof profile.toObject === 'function' ? profile.toObject() : { ...profile };
  // Prefer explicit plan-scoped inputs; profile values are legacy fallbacks only.
  const training = {
    fitnessGoal: options.fitnessGoal || profileLean.fitnessGoal || 'general_fitness',
    trainingExperience:
      options.trainingExperience || profileLean.trainingExperience || 'beginner',
    trainingDaysPerWeek:
      options.trainingDaysPerWeek != null
        ? Number(options.trainingDaysPerWeek)
        : Number(profileLean.trainingDaysPerWeek) || 3,
    priorityMuscleGroup:
      options.priorityMuscleGroup != null
        ? String(options.priorityMuscleGroup)
        : profileLean.priorityMuscleGroup || '',
    sessionDurationMinutes:
      options.sessionDurationMinutes != null
        ? Number(options.sessionDurationMinutes)
        : Number(profileLean.sessionDurationMinutes) || 45,
  };

  // Plan-scoped training overrides + member body/equipment/limitations.
  const generationProfile = {
    ...profileLean,
    ...training,
  };

  const candidate = await generateCandidatePlan(generationProfile);
  const candidateCatalog = await loadExerciseCatalog(candidate);

  const decisionInput = {
    memberId: profile._id,
    profile: generationProfile,
    rules: candidate,
    catalog: candidateCatalog,
    templateId: candidate.matchedTemplateId,
  };
  // Keep the HTTP chain offline-stable in tests / CI.
  if (shouldUseMockAi()) {
    decisionInput.provider = createMockProvider();
  }

  const result = await runDecisionWithFallback(decisionInput);

  let planDraft;
  let safety;
  let validatedBy = result.validatedBy || 'system';

  if (result.source === 'rules_fallback') {
    planDraft = {
      ...result.planDraft,
      templateId: result.planDraft.templateId || candidate.matchedTemplateId,
    };
    // Re-check with plan-scoped session/experience (fallback may have used profile).
    const catalog = await loadExerciseCatalog(planDraft);
    safety = validatePlan(
      planDraft,
      safetyContext(profile, training, planDraft.weeklyVolumeTarget, catalog)
    );
  } else {
    // AI passed Day-1 schema only — still must pass equipment/volume/session safety.
    planDraft = mergeAiAdjustments(candidate, result.ai.parsed.adjustments);
    planDraft = {
      ...planDraft,
      memberId: profile._id,
      templateId: candidate.matchedTemplateId,
      trainingDaysPerWeek: training.trainingDaysPerWeek,
      sessionDurationMinutes: training.sessionDurationMinutes,
      weeklyVolumeTarget: candidate.weeklyVolumeTarget,
      aiReason: result.ai.parsed.reason,
      aiDecisionId: result.ai.decision?._id,
    };

    const catalog = await loadExerciseCatalog(planDraft);
    safety = validatePlan(
      planDraft,
      safetyContext(profile, training, planDraft.weeklyVolumeTarget, catalog)
    );

    // Schema-valid AI adjustments often break safety (bad SWAP/ADD, volume, duration).
    // Fall back to the deterministic rules candidate — same path as contract failure.
    if (!safety.ok) {
      const issueSummary = (safety.issues || [])
        .map((i) => i.message)
        .slice(0, 3)
        .join('; ');
      planDraft = buildRulesOnlyPlan({
        memberId: profile._id,
        rules: candidate,
        profile: generationProfile,
        templateId: candidate.matchedTemplateId,
        aiDecisionId: result.ai?.decision?._id,
        fallbackReason: FALLBACK_REASON.AI_SAFETY_FAIL,
        fallbackMessage: `Rules-only fallback: AI adjustments failed safety (${issueSummary || 'unknown'})`,
      });
      planDraft.templateId =
        planDraft.templateId || candidate.matchedTemplateId;
      const rulesCatalog = await loadExerciseCatalog(planDraft);
      safety = validatePlan(
        planDraft,
        safetyContext(profile, training, planDraft.weeklyVolumeTarget, rulesCatalog)
      );
      validatedBy = 'system';
    }
  }

  if (!safety.ok) {
    const error = new Error('Workout plan failed safety validation');
    error.status = 422;
    error.details = safety.issues;
    throw error;
  }

  if (!planDraft.templateId) {
    const error = new Error('No matching workout template for profile');
    error.status = 422;
    throw error;
  }

  const days =
    planDraft.trainingDaysPerWeek || training.trainingDaysPerWeek;
  const sessionMinutes =
    planDraft.sessionDurationMinutes || training.sessionDurationMinutes;

  // Rebuild an existing library plan in place (keeps id / enabled / selection).
  if (options.replacePlanId) {
    const existing = await WorkoutPlan.findOne({
      _id: options.replacePlanId,
      memberId: profile._id,
    });
    if (!existing) {
      const error = new Error('Plan not found');
      error.status = 404;
      throw error;
    }

    const name =
      (options.name && String(options.name).trim()) ||
      existing.name ||
      defaultPlanName(planDraft.splitType, days, 1);

    existing.set({
      templateId: planDraft.templateId,
      splitType: planDraft.splitType,
      name,
      fitnessGoal: training.fitnessGoal,
      trainingExperience: training.trainingExperience,
      priorityMuscleGroup: training.priorityMuscleGroup || '',
      trainingDaysPerWeek: days,
      sessionDurationMinutes: sessionMinutes,
      weeklyVolumeTarget: planDraft.weeklyVolumeTarget,
      days: planDraft.days,
      aiReason: planDraft.aiReason,
      aiDecisionId: result.ai?.decision?._id || planDraft.aiDecisionId,
      status: 'active',
      validatedBy: validatedBy || planDraft.validatedBy || 'system',
    });
    await existing.save();
    return existing;
  }

  const existingCount = await WorkoutPlan.countDocuments({ memberId: profile._id });
  const shouldSelect = existingCount === 0 || options.select === true;

  if (shouldSelect) {
    await WorkoutPlan.updateMany(
      { memberId: profile._id, isActive: true },
      { $set: { isActive: false } }
    );
  }

  const name =
    (options.name && String(options.name).trim()) ||
    defaultPlanName(planDraft.splitType, days, existingCount + 1);

  return WorkoutPlan.create({
    ...planDraft,
    memberId: profile._id,
    name,
    note: '',
    fitnessGoal: training.fitnessGoal,
    trainingExperience: training.trainingExperience,
    priorityMuscleGroup: training.priorityMuscleGroup || '',
    trainingDaysPerWeek: days,
    sessionDurationMinutes: sessionMinutes,
    status: 'active',
    enabled: true,
    isActive: shouldSelect,
    validatedBy: validatedBy || planDraft.validatedBy || 'system',
    aiDecisionId: result.ai?.decision?._id || planDraft.aiDecisionId,
  });
}
    

module.exports = {
  generateWorkoutPlan,
  mergeAiAdjustments,
};