const { WorkoutTemplate, Exercise } = require('../database/models');
const {
  FITNESS_GOAL_VALUES,
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
 * Convert rest interval strings to seconds (midpoint)
 * @param {string} restString - e.g. "2-3 min", "60-90 sec"
 * @returns {number} seconds
 */
function convertRestToSeconds(restString) {
  const mapping = {
    '3-5 min': 240,
    '2-3 min': 150,
    '60-90 sec': 75,
    '45-75 sec': 60,
    '30-60 sec': 45,
  };
  
  return mapping[restString] || 90; // Default fallback
}

/**
 * Map user-facing muscle focus strings to primaryMuscles values in Exercise schema
 * @param {string} muscleFocus - e.g. "Chest, Triceps, Front Delts"
 * @returns {string[]} normalized muscle tags
 */
function parseMuscleFocus(muscleFocus) {
  if (!muscleFocus) return [];
  
  const mapping = {
    'chest': 'chest',
    'back': 'back',
    'lats': 'lats',
    'shoulders': 'shoulders',
    'front delts': 'front_delts',
    'side delts': 'side_delts',
    'rear delts': 'rear_delts',
    'biceps': 'biceps',
    'triceps': 'triceps',
    'quads': 'quads',
    'hamstrings': 'hamstrings',
    'glutes': 'glutes',
    'calves': 'calves',
    'core': 'core',
    'forearms': 'forearms',
    'traps': 'traps',
    'upper back': 'upper_back',
  };
  
  const normalized = [];
  const lowerFocus = muscleFocus.toLowerCase();
  
  for (const [key, value] of Object.entries(mapping)) {
    if (lowerFocus.includes(key)) {
      normalized.push(value);
    }
  }
  
  return normalized.length > 0 ? normalized : ['full_body'];
}

/**
 * Select exercises for a given day
 * @param {string[]} muscleFocusArray - normalized muscle tags
 * @param {string[]} equipmentAvailable - from memberProfile
 * @param {string[]} limitations - from memberProfile (contraindications)
 * @param {string} experienceLevel - beginner/intermediate/advanced
 * @returns {Promise<Object[]>} array of Exercise documents
 */
async function selectExercises(muscleFocusArray, equipmentAvailable, limitations, experienceLevel) {
  // Query: primaryMuscles intersects muscle focus, equipment available, no contraindications overlap
  const query = {
    isApproved: true,
    primaryMuscles: { $in: muscleFocusArray },
    equipmentRequired: { $not: { $elemMatch: { $nin: equipmentAvailable } } },
  };
  
  // Exclude exercises with contraindications that match the user's limitations
  if (limitations && limitations.length > 0) {
    query.contraindications = { $not: { $elemMatch: { $in: limitations } } };
  }
  
  // Prefer exercises at or below user's experience level
  const difficultyOrder = {
    'beginner': ['beginner'],
    'intermediate': ['beginner', 'intermediate'],
    'advanced': ['beginner', 'intermediate', 'advanced'],
  };
  query.difficulty = { $in: difficultyOrder[experienceLevel] || ['beginner', 'intermediate'] };
  
  const exercises = await Exercise.find(query).limit(20); // Limit to 20 to avoid overload
  
  return exercises;
}

/**
 * Generate a candidate workout plan based on member profile
 * @param {Object} memberProfile - MemberProfile document
 * @returns {Promise<Object>} Candidate plan structure with populated exercises
 */
async function generateCandidatePlan(memberProfile) {
  if (!memberProfile) {
    throw new Error('memberProfile is required');
  }

  const {
    trainingDaysPerWeek,
    trainingExperience,
    fitnessGoal,
    equipmentAvailable,
    limitations,
  } = memberProfile;

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
  
  // Convert rest to seconds for use in exercises
  const defaultRestSeconds = convertRestToSeconds(defaultRest);

  // Step 4: Build day structure from template (or generate minimal default)
  const days = [];
  
  if (matchedTemplate && matchedTemplate.defaultStructure) {
    for (const [index, day] of matchedTemplate.defaultStructure.entries()) {
      const dayOfWeek = typeof day.dayOfWeek === 'string' ? day.dayOfWeek : `Day ${index + 1}`;
      const muscleFocus = day.muscleGroups.join(', ');
      const muscleFocusArray = parseMuscleFocus(muscleFocus);
      
      // Select exercises for this day
      const availableExercises = await selectExercises(
        muscleFocusArray,
        equipmentAvailable || [],
        limitations || [],
        trainingExperience
      );
      
      // CRITICAL: If no exercises found, stop immediately
      if (availableExercises.length === 0) {
        throw new Error(
          `No exercises found for day "${dayOfWeek}" with muscle focus "${muscleFocus}". ` +
          `Check equipment availability and contraindications.`
        );
      }
      
      // Select 4-6 exercises (or fewer if not enough available)
      const exerciseCount = Math.min(availableExercises.length, Math.floor(Math.random() * 3) + 4); // 4-6
      const selectedExercises = availableExercises.slice(0, exerciseCount);
      
      // Build exercise objects with action, sets, reps, rpe, restSeconds
      const exercises = selectedExercises.map((exercise) => ({
        exerciseId: exercise._id,
        action: 'KEEP',
        sets: setsRepsRestRpeDefaults.sets,
        reps: setsRepsRestRpeDefaults.reps,
        rpe: setsRepsRestRpeDefaults.rpe,
        restSeconds: defaultRestSeconds,
      }));
      
      days.push({
        dayOfWeek,
        exercises,
      });
    }
  } else {
    // No template found — generate minimal structure
    for (let i = 0; i < trainingDaysPerWeek; i++) {
      const dayOfWeek = `Day ${i + 1}`;
      const muscleFocus = splitType === 'full_body' ? 'Full Body' : 'TBD';
      const muscleFocusArray = parseMuscleFocus(muscleFocus);
      
      const availableExercises = await selectExercises(
        muscleFocusArray,
        equipmentAvailable || [],
        limitations || [],
        trainingExperience
      );
      
      if (availableExercises.length === 0) {
        throw new Error(
          `No exercises found for day "${dayOfWeek}" with muscle focus "${muscleFocus}". ` +
          `Check equipment availability and contraindications.`
        );
      }
      
      const exerciseCount = Math.min(availableExercises.length, Math.floor(Math.random() * 3) + 4);
      const selectedExercises = availableExercises.slice(0, exerciseCount);
      
      const exercises = selectedExercises.map((exercise) => ({
        exerciseId: exercise._id,
        action: 'KEEP',
        sets: setsRepsRestRpeDefaults.sets,
        reps: setsRepsRestRpeDefaults.reps,
        rpe: setsRepsRestRpeDefaults.rpe,
        restSeconds: defaultRestSeconds,
      }));
      
      days.push({
        dayOfWeek,
        exercises,
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
  convertRestToSeconds, // Export for testing
  parseMuscleFocus, // Export for testing
};
