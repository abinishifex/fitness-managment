const {
  MemberProfile,
  Exercise,
  WorkoutPlan,
} = require('../database/models');
const { generateCandidatePlan } = require('./rulesEngine');
const { runDecisionWithFallback } = require('../ai/fallbackPlan');
const { validatePlan } = require('../safety/safetyValidator');

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

async function generateWorkoutPlan(userId) {
  const profile = await MemberProfile.findOne({ userId });
  if (!profile) {
    const error = new Error('Member profile not found');
    error.status = 404;
    throw error;
  }

  const candidate = await generateCandidatePlan(profile);
  const candidateCatalog = await loadExerciseCatalog(candidate);
  const result = await runDecisionWithFallback({
    memberId: profile._id,
    profile,
    rules: candidate,
    catalog: candidateCatalog,
  });

  let planDraft;
  let safety;

  if (result.source === 'rules_fallback') {
    planDraft = {
      ...result.planDraft,
      templateId: result.planDraft.templateId || candidate.matchedTemplateId,
    };
    safety = result.safety;
  } else {
    planDraft = mergeAiAdjustments(candidate, result.ai.parsed.adjustments);
    planDraft = {
      ...planDraft,
      memberId: profile._id,
      templateId: candidate.matchedTemplateId,
      trainingDaysPerWeek: profile.trainingDaysPerWeek,
      sessionDurationMinutes: profile.sessionDurationMinutes,
      aiReason: result.ai.parsed.reason,
      aiDecisionId: result.ai.decision?._id,
    };

    const catalog = await loadExerciseCatalog(planDraft);
    safety = validatePlan(planDraft, {
      catalog,
      equipmentAvailable: profile.equipmentAvailable || [],
      limitations: profile.limitations || [],
      sessionDurationMinutes: profile.sessionDurationMinutes,
      trainingExperience: profile.trainingExperience,
      weeklyVolumeTarget: planDraft.weeklyVolumeTarget,
    });
  }

  if (!safety.ok) {
    const error = new Error('Workout plan failed safety validation');
    error.status = 422;
    error.details = safety.issues;
    throw error;
  }

  return WorkoutPlan.create({
    ...planDraft,
    memberId: profile._id,
    status: 'active',
    isActive: true,
    validatedBy: result.validatedBy || planDraft.validatedBy || 'system',
    aiDecisionId: result.ai?.decision?._id || planDraft.aiDecisionId,
  });
}
    

module.exports = {
  generateWorkoutPlan,
  mergeAiAdjustments,
};