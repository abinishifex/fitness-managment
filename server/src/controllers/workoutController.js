const { MemberProfile, WorkoutPlan } = require('../database/models');
const { generateWorkoutPlan } = require('../services/planGeneration');
const { createError } = require('../middleware/errorHandler');

const EXERCISE_POPULATE = {
  path: 'days.exercises.exerciseId',
  select:
    'name slug primaryMuscles secondaryMuscles equipmentRequired difficulty type instructions formCues movementPattern',
};

async function generatePlan(req, res, next) {
  try {
    const plan = await generateWorkoutPlan(req.userId);
    res.status(201).json({ success: true, data: { plan } });
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

async function findActivePlan(userId) {
  const profile = await MemberProfile.findOne({ userId });
  if (!profile) {
    throw createError(404, 'Profile not found');
  }

  const plan = await WorkoutPlan.findOne({
    memberId: profile._id,
    isActive: true,
    status: 'active',
  })
    .populate(EXERCISE_POPULATE)
    .sort({ updatedAt: -1 });

  if (!plan) {
    throw createError(404, 'No active plan');
  }

  return { profile, plan };
}

async function getTodayWorkout(req, res, next) {
  try {
    const { plan } = await findActivePlan(req.userId);
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
    const { plan } = await findActivePlan(req.userId);
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
        splitType: plan.splitType,
        trainingDaysPerWeek: plan.trainingDaysPerWeek,
        sessionDurationMinutes: plan.sessionDurationMinutes,
        weeklyVolumeTarget: plan.weeklyVolumeTarget || null,
        aiReason: plan.aiReason || null,
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
  getTodayWorkout,
  getActivePlan,
  getEatWeekday,
};