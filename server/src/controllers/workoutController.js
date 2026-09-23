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
    }).sort({ updatedAt: -1 });

    if (!plan) {
      throw createError(404, 'No active plan');
    }

    const today = getEatWeekday();
    const day = plan.days.find((item) =>
      String(item.dayOfWeek).toLowerCase() === today.name.toLowerCase() ||
      Number(item.dayOfWeek) === today.number
    );

    res.json({
      success: true,
      data: {
        date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10),
        dayOfWeek: today.name,
        exercises: day?.exercises || [],
        isRestDay: !day,
        planId: plan._id,
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