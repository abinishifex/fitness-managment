const { MemberProfile, WorkoutPlan } = require('../database/models');
const { generateWorkoutPlan } = require('../services/planGeneration');
const { createError } = require('../middleware/errorHandler');
const {
  FITNESS_GOAL_VALUES,
  TRAINING_EXPERIENCE_VALUES,
} = require('../config/constants');

const EXERCISE_POPULATE = {
  path: 'days.exercises.exerciseId',
  select:
    'name slug primaryMuscles secondaryMuscles equipmentRequired difficulty type instructions formCues movementPattern',
};

async function getMemberProfile(userId) {
  const profile = await MemberProfile.findOne({ userId });
  if (!profile) {
    throw createError(404, 'Profile not found');
  }
  return profile;
}

function parseTrainingPatch(body = {}) {
  const patch = {};

  if (body.fitnessGoal != null) {
    if (!FITNESS_GOAL_VALUES.includes(body.fitnessGoal)) {
      throw createError(400, `fitnessGoal must be one of: ${FITNESS_GOAL_VALUES.join(', ')}`);
    }
    patch.fitnessGoal = body.fitnessGoal;
  }

  if (body.trainingExperience != null) {
    if (!TRAINING_EXPERIENCE_VALUES.includes(body.trainingExperience)) {
      throw createError(
        400,
        `trainingExperience must be one of: ${TRAINING_EXPERIENCE_VALUES.join(', ')}`
      );
    }
    patch.trainingExperience = body.trainingExperience;
  }

  if (body.trainingDaysPerWeek != null) {
    const days = Number(body.trainingDaysPerWeek);
    if (!Number.isInteger(days) || days < 1 || days > 7) {
      throw createError(400, 'trainingDaysPerWeek must be an integer from 1 to 7');
    }
    patch.trainingDaysPerWeek = days;
  }

  if (body.priorityMuscleGroup != null) {
    patch.priorityMuscleGroup = String(body.priorityMuscleGroup).trim().slice(0, 120);
  }

  if (body.sessionDurationMinutes != null) {
    const mins = Number(body.sessionDurationMinutes);
    if (!Number.isInteger(mins) || mins < 15 || mins > 300) {
      throw createError(400, 'sessionDurationMinutes must be an integer from 15 to 300');
    }
    patch.sessionDurationMinutes = mins;
  }

  if (body.aiReason != null) {
    patch.aiReason = String(body.aiReason).trim().slice(0, 2000);
  }

  return patch;
}

const PLAN_ACTIONS = ['KEEP', 'SWAP', 'ADD', 'REMOVE'];

const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const WEEKDAY_ALIASES = {
  monday: 'Monday',
  mon: 'Monday',
  tuesday: 'Tuesday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  wednesday: 'Wednesday',
  wed: 'Wednesday',
  thursday: 'Thursday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  friday: 'Friday',
  fri: 'Friday',
  saturday: 'Saturday',
  sat: 'Saturday',
  sunday: 'Sunday',
  sun: 'Sunday',
};

const NUMBER_TO_WEEKDAY = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

function normalizeDayOfWeek(value, dayIndex) {
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(String(value).trim()))) {
    const n = Number(value);
    const name = NUMBER_TO_WEEKDAY[n];
    if (!name) {
      throw createError(400, `days[${dayIndex}].dayOfWeek must be 1–7 or a weekday name`);
    }
    return name;
  }
  const key = String(value).trim().toLowerCase();
  if (WEEKDAY_ALIASES[key]) return WEEKDAY_ALIASES[key];
  const dayN = key.match(/^day\s*(\d+)$/);
  if (dayN) {
    const name = NUMBER_TO_WEEKDAY[Number(dayN[1])];
    if (name) return name;
  }
  throw createError(
    400,
    `days[${dayIndex}].dayOfWeek must be one of: ${WEEKDAY_NAMES.join(', ')} (or 1–7)`
  );
}

function parseDaysPatch(body = {}) {
  if (body.days == null) return null;
  if (!Array.isArray(body.days)) {
    throw createError(400, 'days must be an array');
  }
  if (body.days.length > 14) {
    throw createError(400, 'days cannot exceed 14 entries');
  }

  return body.days.map((day, dayIndex) => {
    if (!day || typeof day !== 'object') {
      throw createError(400, `days[${dayIndex}] must be an object`);
    }
    if (day.dayOfWeek == null || day.dayOfWeek === '') {
      throw createError(400, `days[${dayIndex}].dayOfWeek is required`);
    }
    if (!Array.isArray(day.exercises)) {
      throw createError(400, `days[${dayIndex}].exercises must be an array`);
    }
    if (day.exercises.length > 40) {
      throw createError(400, `days[${dayIndex}].exercises cannot exceed 40`);
    }

    return {
      dayOfWeek: normalizeDayOfWeek(day.dayOfWeek, dayIndex),
      exercises: day.exercises.map((ex, exIndex) => {
        if (!ex || typeof ex !== 'object') {
          throw createError(400, `days[${dayIndex}].exercises[${exIndex}] must be an object`);
        }
        if (!ex.exerciseId) {
          throw createError(400, `days[${dayIndex}].exercises[${exIndex}].exerciseId is required`);
        }
        if (!PLAN_ACTIONS.includes(ex.action)) {
          throw createError(
            400,
            `days[${dayIndex}].exercises[${exIndex}].action must be one of: ${PLAN_ACTIONS.join(', ')}`
          );
        }
        const sets = Number(ex.sets);
        if (!Number.isInteger(sets) || sets < 1 || sets > 20) {
          throw createError(400, `days[${dayIndex}].exercises[${exIndex}].sets must be 1–20`);
        }
        const reps = String(ex.reps || '').trim();
        if (!reps || reps.length > 32) {
          throw createError(400, `days[${dayIndex}].exercises[${exIndex}].reps is required (max 32)`);
        }

        const row = {
          exerciseId: ex.exerciseId,
          action: ex.action,
          sets,
          reps,
        };

        if (ex.rpe != null && ex.rpe !== '') {
          const rpe = Number(ex.rpe);
          if (Number.isNaN(rpe) || rpe < 1 || rpe > 10) {
            throw createError(400, `days[${dayIndex}].exercises[${exIndex}].rpe must be 1–10`);
          }
          row.rpe = rpe;
        }

        if (ex.restSeconds != null && ex.restSeconds !== '') {
          const rest = Number(ex.restSeconds);
          if (!Number.isInteger(rest) || rest < 0 || rest > 600) {
            throw createError(
              400,
              `days[${dayIndex}].exercises[${exIndex}].restSeconds must be 0–600`
            );
          }
          row.restSeconds = rest;
        }

        return row;
      }),
    };
  });
}

function parseGenerateOptions(body = {}) {
  return {
    name: body.name,
    select: body.select === true,
    ...parseTrainingPatch(body),
  };
}

async function generatePlan(req, res, next) {
  try {
    const options = parseGenerateOptions(req.body || {});
    const plan = await generateWorkoutPlan(req.userId, options);
    res.status(201).json({ success: true, data: { plan } });
  } catch (err) {
    next(err);
  }
}

async function regeneratePlan(req, res, next) {
  try {
    const options = parseGenerateOptions(req.body || {});
    const plan = await generateWorkoutPlan(req.userId, {
      ...options,
      replacePlanId: req.params.id,
    });
    res.json({ success: true, data: { plan: serializePlanSummary(plan) } });
  } catch (err) {
    next(err);
  }
}

function getEatWeekday(date = new Date()) {
  const eatDate = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const day = eatDate.getUTCDay();
  return {
    number: day === 0 ? 7 : day,
    name: eatDate.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
    }),
  };
}

function serializeExercise(item) {
  const doc = item.toObject ? item.toObject() : { ...item };
  const populated = doc.exerciseId && typeof doc.exerciseId === 'object' ? doc.exerciseId : null;
  return {
    exerciseId: populated?._id || doc.exerciseId,
    action: doc.action,
    sets: doc.sets,
    reps: doc.reps,
    rpe: doc.rpe,
    restSeconds: doc.restSeconds,
    exercise: populated
      ? {
          _id: populated._id,
          name: populated.name,
          slug: populated.slug,
          primaryMuscles: populated.primaryMuscles || [],
          secondaryMuscles: populated.secondaryMuscles || [],
          equipmentRequired: populated.equipmentRequired || [],
          difficulty: populated.difficulty,
          type: populated.type,
          instructions: populated.instructions,
          formCues: populated.formCues || [],
          movementPattern: populated.movementPattern,
        }
      : null,
  };
}

function dayMatchesWeekday(item, weekday) {
  return (
    String(item.dayOfWeek).toLowerCase() === weekday.name.toLowerCase() ||
    Number(item.dayOfWeek) === weekday.number
  );
}

function serializePlanSummary(plan) {
  const doc = plan.toObject ? plan.toObject() : { ...plan };
  return {
    planId: String(doc._id),
    name: doc.name || '',
    note: doc.note || '',
    splitType: doc.splitType,
    fitnessGoal: doc.fitnessGoal || null,
    trainingExperience: doc.trainingExperience || null,
    priorityMuscleGroup: doc.priorityMuscleGroup || '',
    trainingDaysPerWeek: doc.trainingDaysPerWeek,
    sessionDurationMinutes: doc.sessionDurationMinutes,
    status: doc.status,
    enabled: doc.enabled !== false,
    isActive: Boolean(doc.isActive),
    aiReason: doc.aiReason || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function findPlanForMember(userId, planId) {
  const profile = await getMemberProfile(userId);
  const query = { memberId: profile._id };
  if (planId) {
    query._id = planId;
  } else {
    query.isActive = true;
  }

  let plan = await WorkoutPlan.findOne(query).populate(EXERCISE_POPULATE).sort({ updatedAt: -1 });

  // Fallback: if no selected plan, use newest enabled plan
  if (!plan && !planId) {
    plan = await WorkoutPlan.findOne({ memberId: profile._id, enabled: true })
      .populate(EXERCISE_POPULATE)
      .sort({ updatedAt: -1 });
  }

  if (!plan) {
    throw createError(404, planId ? 'Plan not found' : 'No active plan');
  }

  return { profile, plan };
}

async function ensureSelectedAfterChange(memberId, preferredId) {
  const current = await WorkoutPlan.findOne({ memberId, isActive: true, enabled: true });
  if (current) return current;

  const next =
    (preferredId
      ? await WorkoutPlan.findOne({ _id: preferredId, memberId, enabled: true })
      : null) ||
    (await WorkoutPlan.findOne({ memberId, enabled: true }).sort({ updatedAt: -1 }));

  if (!next) return null;

  await WorkoutPlan.updateMany({ memberId, isActive: true }, { $set: { isActive: false } });
  next.isActive = true;
  await next.save();
  return next;
}

async function listPlans(req, res, next) {
  try {
    const profile = await getMemberProfile(req.userId);
    const plans = await WorkoutPlan.find({ memberId: profile._id }).sort({ updatedAt: -1 });
    res.json({
      success: true,
      data: {
        plans: plans.map(serializePlanSummary),
        selectedPlanId: plans.find((p) => p.isActive)?._id?.toString() || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function selectPlan(req, res, next) {
  try {
    const profile = await getMemberProfile(req.userId);
    const plan = await WorkoutPlan.findOne({ _id: req.params.id, memberId: profile._id });
    if (!plan) throw createError(404, 'Plan not found');
    if (plan.enabled === false) {
      throw createError(400, 'Activate the plan before selecting it');
    }

    await WorkoutPlan.updateMany(
      { memberId: profile._id, isActive: true },
      { $set: { isActive: false } }
    );
    plan.isActive = true;
    await plan.save();

    res.json({
      success: true,
      data: { plan: serializePlanSummary(plan) },
    });
  } catch (err) {
    next(err);
  }
}

async function updatePlan(req, res, next) {
  try {
    const profile = await getMemberProfile(req.userId);
    const plan = await WorkoutPlan.findOne({ _id: req.params.id, memberId: profile._id });
    if (!plan) throw createError(404, 'Plan not found');

    if (typeof req.body?.name === 'string') {
      plan.name = req.body.name.trim().slice(0, 80);
    }
    if (typeof req.body?.note === 'string') {
      plan.note = req.body.note.trim().slice(0, 280);
    }
    if (typeof req.body?.enabled === 'boolean') {
      plan.enabled = req.body.enabled;
      if (!plan.enabled && plan.isActive) {
        plan.isActive = false;
      }
    }

    const trainingPatch = parseTrainingPatch(req.body || {});
    Object.assign(plan, trainingPatch);

    const daysPatch = parseDaysPatch(req.body || {});
    if (daysPatch) {
      plan.days = daysPatch;
      plan.validatedBy = 'manual';
      if (plan.status === 'draft') plan.status = 'validated';
    }

    await plan.save();

    if (typeof req.body?.enabled === 'boolean' && req.body.enabled === false) {
      await ensureSelectedAfterChange(profile._id);
    }

    const refreshed = await WorkoutPlan.findById(plan._id);
    res.json({
      success: true,
      data: { plan: serializePlanSummary(refreshed) },
    });
  } catch (err) {
    next(err);
  }
}

async function deletePlan(req, res, next) {
  try {
    const profile = await getMemberProfile(req.userId);
    const plan = await WorkoutPlan.findOne({ _id: req.params.id, memberId: profile._id });
    if (!plan) throw createError(404, 'Plan not found');

    const wasActive = plan.isActive;
    await plan.deleteOne();

    if (wasActive) {
      await ensureSelectedAfterChange(profile._id);
    }

    res.json({
      success: true,
      data: { deleted: true, planId: req.params.id },
    });
  } catch (err) {
    next(err);
  }
}

async function getTodayWorkout(req, res, next) {
  try {
    const planId = req.query.planId || null;
    const { plan } = await findPlanForMember(req.userId, planId);
    const today = getEatWeekday();
    const day = plan.days.find((item) => dayMatchesWeekday(item, today));
    const exercises = (day?.exercises || []).map(serializeExercise);

    res.json({
      success: true,
      data: {
        date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10),
        dayOfWeek: today.name,
        exercises,
        isRestDay: !day,
        planId: plan._id,
        planName: plan.name || '',
        splitType: plan.splitType,
        sessionDurationMinutes: plan.sessionDurationMinutes,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getActivePlan(req, res, next) {
  try {
    const planId = req.query.planId || null;
    const { plan } = await findPlanForMember(req.userId, planId);
    const today = getEatWeekday();

    const days = (plan.days || []).map((item) => {
      const doc = item.toObject ? item.toObject() : { ...item };
      return {
        dayOfWeek: doc.dayOfWeek,
        exercises: (doc.exercises || []).map(serializeExercise),
        isToday: dayMatchesWeekday(doc, today),
      };
    });

    res.json({
      success: true,
      data: {
        planId: plan._id,
        name: plan.name || '',
        note: plan.note || '',
        splitType: plan.splitType,
        fitnessGoal: plan.fitnessGoal || null,
        trainingExperience: plan.trainingExperience || null,
        priorityMuscleGroup: plan.priorityMuscleGroup || '',
        trainingDaysPerWeek: plan.trainingDaysPerWeek,
        sessionDurationMinutes: plan.sessionDurationMinutes,
        weeklyVolumeTarget: plan.weeklyVolumeTarget || null,
        aiReason: plan.aiReason || null,
        enabled: plan.enabled !== false,
        isActive: Boolean(plan.isActive),
        todayDayOfWeek: today.name,
        days,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generatePlan,
  regeneratePlan,
  listPlans,
  selectPlan,
  updatePlan,
  deletePlan,
  getTodayWorkout,
  getActivePlan,
  getEatWeekday,
};
