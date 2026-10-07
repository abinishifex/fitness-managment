const { MemberProfile, WorkoutPlan } = require('../database/models');
const { generateWorkoutPlan } = require('../services/planGeneration');
const { createError } = require('../middleware/errorHandler');

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

async function getTodayWorkout(req, res, next) {
  try {
    const profile = await MemberProfile.findOne({ userId: req.userId });
    if (!profile) {
      throw createError(404, 'Profile not found');
    }

    const plan = await WorkoutPlan.findOne({
      memberId: profile._id,
      isActive: true,
      status: 'active',
    })
      .populate({
        path: 'days.exercises.exerciseId',
        select:
          'name slug primaryMuscles secondaryMuscles equipmentRequired difficulty type instructions formCues movementPattern',
      })
      .sort({ updatedAt: -1 });

    if (!plan) {
      throw createError(404, 'No active plan');
    }

    const today = getEatWeekday();
    const day = plan.days.find((item) =>
      String(item.dayOfWeek).toLowerCase() === today.name.toLowerCase() ||
      Number(item.dayOfWeek) === today.number
    );

    const exercises = (day?.exercises || []).map((item) => {
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
    });

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

module.exports = {
  generatePlan,
  getTodayWorkout,
  getEatWeekday,
};