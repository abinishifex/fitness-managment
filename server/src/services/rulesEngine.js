const { WorkoutTemplate } = require('../database/models');
const {
  FITNESS_GOAL_VALUES,
  TRAINING_EXPERIENCE_VALUES,
} = require('../config/constants');

/**
 * Workout Rules Engine
 * Deterministic logic to generate a candidate workout plan structure
 * Does NOT save to DB, does NOT call AI — returns a plan object
 */

// Sets/reps/rest/rpe defaults by fitness goal
const GOAL_DEFAULTS = {
  strength: {
    reps: '1-6',
    sets: 4,
    rest: '3-5 min',
    rpe: 9,
  },
  muscle_gain: {
    reps: '6-12',
    sets: 3,
    restCompound: '2-3 min',
    restIsolation: '60-90 sec',
    rpe: 8,
  },
  fat_loss: {
    reps: '8-15',
    sets: 3,
    rest: '45-75 sec',
    rpe: 8,
  },
  general_fitness: {
    reps: '12-20',
    sets: 2,
    rest: '30-60 sec',
    rpe: 7,
  },
};

/**
 * Generate a candidate workout plan based on member profile
 * @param {Object} memberProfile - MemberProfile document
 * @returns {Promise<Object>} Candidate plan structure
 */
async function generateCandidatePlan(memberProfile) {
  if (!memberProfile) {
    throw new Error('memberProfile is required');
  }

  const { trainingDaysPerWeek, trainingExperience, fitnessGoal } = memberProfile;

  // Validate fitnessGoal
  if (!FITNESS_GOAL_VALUES.includes(fitnessGoal)) {
    throw new Error(
      `Invalid fitnessGoal: "${fitnessGoal}". Must be one of: ${FITNESS_GOAL_VALUES.join(', ')}`
    );
  }

  // Step 1: Determine split type based on training days + experience
  let splitType;

  if (trainingDaysPerWeek >= 2 && trainingDaysPerWeek <= 3) {
    splitType = 'full_body';
  } else if (trainingDaysPerWeek === 4) {
    // Override to full_body for beginners even at 4 days
    splitType = trainingExperience === 'beginner' ? 'full_body' : 'upper_lower';
  } else if (trainingDaysPerWeek >= 5 && trainingDaysPerWeek <= 6) {
    splitType = 'push_pull_legs';
  } else {
    // Fallback for 7+ days (shouldn't happen per validation, but handle gracefully)
    splitType = 'push_pull_legs';
  }

  // Step 2: Query WorkoutTemplate for closest match
  let matchedTemplate = await WorkoutTemplate.findOne({
    splitType,
    experienceLevel: trainingExperience,
    daysPerWeek: trainingDaysPerWeek,
    isActive: true,
  });

  // Fallback: if no exact match, find closest daysPerWeek within same splitType + experienceLevel
  if (!matchedTemplate) {
    matchedTemplate = await WorkoutTemplate.findOne({
      splitType,
      experienceLevel: trainingExperience,
      isActive: true,
    }).sort({ daysPerWeek: -1 }); // Prefer higher days as fallback
  }

  // Further fallback: relax experienceLevel if still no match
  if (!matchedTemplate) {
    matchedTemplate = await WorkoutTemplate.findOne({
      splitType,
      isActive: true,
    }).sort({ daysPerWeek: -1 });
  }

  const matchedTemplateId = matchedTemplate ? matchedTemplate._id : null;

  // Step 3: Get sets/reps/rest/rpe defaults for this goal
  const goalDefaults = GOAL_DEFAULTS[fitnessGoal];
  if (!goalDefaults) {
    throw new Error(`No defaults defined for fitnessGoal: ${fitnessGoal}`);
  }

  // For muscle_gain, use compound rest as default (can be refined per-exercise later)
  const defaultRest =
    fitnessGoal === 'muscle_gain' ? goalDefaults.restCompound : goalDefaults.rest;

  const setsRepsRestRpeDefaults = {
    sets: goalDefaults.sets,
    reps: goalDefaults.reps,
    rest: defaultRest,
    rpe: goalDefaults.rpe,
  };

  // Step 4: Build day structure from template (or generate minimal default)
  const days = [];
  if (matchedTemplate && matchedTemplate.defaultStructure) {
    matchedTemplate.defaultStructure.forEach((day, index) => {
      days.push({
        dayOrder: index + 1,
        dayLabel: typeof day.dayOfWeek === 'string' ? day.dayOfWeek : `Day ${index + 1}`,
        muscleFocus: day.muscleGroups.join(', '),
        setsRepsRestRpeDefaults,
      });
    });
  } else {
    // No template found — generate minimal structure
    for (let i = 0; i < trainingDaysPerWeek; i++) {
      days.push({
        dayOrder: i + 1,
        dayLabel: `Day ${i + 1}`,
        muscleFocus: splitType === 'full_body' ? 'Full Body' : 'TBD',
        setsRepsRestRpeDefaults,
      });
    }
  }

  // Step 5: Calculate weekly volume target (simple heuristic)
  // Assume 10-20 sets per muscle group per week, scaled by number of major muscle groups
  const majorMuscleGroups = splitType === 'full_body' ? 6 : splitType === 'upper_lower' ? 5 : 4;
  const weeklyVolumeTarget = majorMuscleGroups * 12; // mid-range default

  return {
    splitType,
    matchedTemplateId,
    weeklyVolumeTarget,
    days,
  };
}

module.exports = {
  generateCandidatePlan,
  GOAL_DEFAULTS, // Export for testing
};
