require('../src/config/loadDotenv');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  generateCandidatePlan,
  GOAL_DEFAULTS,
  convertRestToSeconds,
  parseMuscleFocus,
} = require('../src/services/rulesEngine');
const { WorkoutTemplate, Exercise } = require('../src/database/models');
const { seedWorkoutTemplates } = require('../src/database/seedWorkoutTemplates');
const { seedExercises } = require('../scripts/seedExercises');

// Test database connection + catalogue (idempotent — safe on shared Atlas)
before(async () => {
  const testDbUri =
    process.env.MONGODB_URI_TEST ||
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/gym-trainer-test';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testDbUri, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });
  }

  const [exerciseCount, templateCount] = await Promise.all([
    Exercise.countDocuments(),
    WorkoutTemplate.countDocuments({ isActive: true }),
  ]);
  if (templateCount < 3) {
    await seedWorkoutTemplates();
  }
  if (exerciseCount < 40) {
    await seedExercises();
  }
});

after(async () => {
  await mongoose.connection.close();
});

describe('Workout Rules Engine', () => {
  describe('convertRestToSeconds', () => {
    it('converts rest strings to seconds (midpoint)', () => {
      assert.equal(convertRestToSeconds('3-5 min'), 240);
      assert.equal(convertRestToSeconds('2-3 min'), 150);
      assert.equal(convertRestToSeconds('60-90 sec'), 75);
      assert.equal(convertRestToSeconds('45-75 sec'), 60);
      assert.equal(convertRestToSeconds('30-60 sec'), 45);
      assert.equal(convertRestToSeconds('unknown'), 90); // fallback
    });
  });

  describe('parseMuscleFocus', () => {
    it('parses muscle focus strings into normalized tags', () => {
      const result1 = parseMuscleFocus('Chest, Triceps, Front Delts');
      assert.ok(result1.includes('chest'));
      assert.ok(result1.includes('triceps'));
      assert.ok(result1.includes('shoulders'));

      const result2 = parseMuscleFocus('Back, Lats, Biceps');
      assert.ok(result2.includes('back'));
      assert.ok(result2.includes('lats'));
      assert.ok(result2.includes('biceps'));

      const result3 = parseMuscleFocus('');
      assert.deepEqual(result3, []);

      const fullBody = parseMuscleFocus('Full Body');
      assert.ok(fullBody.includes('chest'));
      assert.ok(fullBody.includes('forearms'));
      assert.ok(fullBody.includes('upper_back'));

      assert.deepEqual(parseMuscleFocus('Arms'), ['biceps', 'triceps', 'forearms']);
      assert.deepEqual(parseMuscleFocus('Legs'), [
        'quads',
        'hamstrings',
        'glutes',
        'calves',
      ]);
    });
  });

  describe('generateCandidatePlan', () => {
    it('beginner + 3 days → full_body with populated exercises', async () => {
      const profile = {
        trainingDaysPerWeek: 3,
        trainingExperience: 'beginner',
        fitnessGoal: 'muscle_gain',
        equipmentAvailable: ['barbell', 'dumbbell', 'bench', 'machine', 'cable_machine'],
        limitations: [],
      };

      const result = await generateCandidatePlan(profile);

      assert.equal(result.splitType, 'full_body');
      assert.ok(result.matchedTemplateId, 'Should match a template');
      assert.equal(result.days.length, 3);
      assert.ok(result.weeklyVolumeTarget > 0);

      // Check that each day has exercises
      for (const day of result.days) {
        assert.ok(day.dayOfWeek, 'Day should have dayOfWeek');
        assert.ok(Array.isArray(day.exercises), 'Day should have exercises array');
        assert.ok(day.exercises.length >= 1, 'Day should have at least 1 exercise');
        assert.ok(day.exercises.length <= 4, 'Day should have at most 4 exercises');

        // Check each exercise has required fields
        for (const exercise of day.exercises) {
          assert.ok(exercise.exerciseId, 'Exercise should have exerciseId');
          assert.equal(exercise.action, 'KEEP', 'Exercise action should be KEEP');
          // full_body caps sets at 2 so weekly volume passes safety validation
          assert.equal(exercise.sets, 2);
          assert.equal(exercise.reps, GOAL_DEFAULTS.muscle_gain.reps);
          assert.equal(exercise.rpe, GOAL_DEFAULTS.muscle_gain.rpe);
          assert.equal(
            exercise.restSeconds,
            convertRestToSeconds(GOAL_DEFAULTS.muscle_gain.restCompound)
          );
        }
      }
    });

    it('beginner + 4 days → full_body (override case) with exercises', async () => {
      const profile = {
        trainingDaysPerWeek: 4,
        trainingExperience: 'beginner',
        fitnessGoal: 'strength',
        equipmentAvailable: ['barbell', 'dumbbell', 'bench', 'bodyweight'],
        limitations: [],
      };

      const result = await generateCandidatePlan(profile);

      // Critical test: beginner at 4 days should override to full_body, not upper_lower
      assert.equal(result.splitType, 'full_body', 'Beginner + 4 days must use full_body split');
      assert.ok(result.matchedTemplateId, 'Should match a template');
      assert.equal(result.days.length, 4);

      // Check exercises populated
      for (const day of result.days) {
        assert.ok(day.exercises.length >= 1);
        assert.ok(day.exercises.length <= 4);
        for (const ex of day.exercises) {
          assert.ok(mongoose.Types.ObjectId.isValid(ex.exerciseId));
          assert.equal(ex.action, 'KEEP');
          assert.equal(ex.sets, 2); // full_body volume cap
        }
      }
    });

    it('intermediate + 4 days → upper_lower with exercises', async () => {
      const profile = {
        trainingDaysPerWeek: 4,
        trainingExperience: 'intermediate',
        fitnessGoal: 'fat_loss',
        equipmentAvailable: ['barbell', 'dumbbell', 'machine', 'bench', 'cable_machine'],
        limitations: [],
      };

      const result = await generateCandidatePlan(profile);

      assert.equal(result.splitType, 'upper_lower');
      assert.ok(result.matchedTemplateId, 'Should match a template');
      assert.equal(result.days.length, 4);

      for (const day of result.days) {
        assert.ok(day.exercises.length >= 1);
        assert.ok(day.exercises.length <= 4);
        for (const ex of day.exercises) {
          assert.equal(ex.sets, GOAL_DEFAULTS.fat_loss.sets);
          assert.equal(ex.reps, GOAL_DEFAULTS.fat_loss.reps);
          assert.equal(ex.rpe, GOAL_DEFAULTS.fat_loss.rpe);
          assert.equal(ex.restSeconds, convertRestToSeconds(GOAL_DEFAULTS.fat_loss.rest));
        }
      }
    });

    it('intermediate + 6 days → push_pull_legs with exercises', async () => {
      const profile = {
        trainingDaysPerWeek: 6,
        trainingExperience: 'intermediate',
        fitnessGoal: 'general_fitness',
        // Use full equipment set to ensure sufficient exercises for all days
        equipmentAvailable: ['dumbbell', 'bodyweight', 'barbell', 'bench', 'machine', 'cable_machine'],
        limitations: [],
      };

      const result = await generateCandidatePlan(profile);

      assert.equal(result.splitType, 'push_pull_legs');
      assert.ok(result.matchedTemplateId, 'Should match a template');
      assert.equal(result.days.length, 6);

      for (const day of result.days) {
        // At least 1 exercise per day (some days may have fewer with limited equipment)
        assert.ok(day.exercises.length >= 1, `Day ${day.dayOfWeek} should have at least 1 exercise`);
        for (const ex of day.exercises) {
          assert.equal(ex.sets, GOAL_DEFAULTS.general_fitness.sets);
          assert.equal(ex.reps, GOAL_DEFAULTS.general_fitness.reps);
          assert.equal(ex.rpe, GOAL_DEFAULTS.general_fitness.rpe);
          assert.equal(ex.restSeconds, convertRestToSeconds(GOAL_DEFAULTS.general_fitness.rest));
        }
      }
    });

    it('invalid fitnessGoal → throws clear error', async () => {
      const profile = {
        trainingDaysPerWeek: 3,
        trainingExperience: 'beginner',
        fitnessGoal: 'invalid_goal_value',
        equipmentAvailable: ['barbell'],
        limitations: [],
      };

      await assert.rejects(
        async () => {
          await generateCandidatePlan(profile);
        },
        {
          message: /Invalid fitnessGoal.*Must be one of/,
        }
      );
    });

    it('missing memberProfile → throws error', async () => {
      await assert.rejects(
        async () => {
          await generateCandidatePlan(null);
        },
        {
          message: /memberProfile is required/,
        }
      );
    });

    it('no matching exercises → throws clear error', async () => {
      const profile = {
        trainingDaysPerWeek: 3,
        trainingExperience: 'beginner',
        fitnessGoal: 'muscle_gain',
        equipmentAvailable: ['none'], // This should result in no exercises
        limitations: [],
      };

      await assert.rejects(
        async () => {
          await generateCandidatePlan(profile);
        },
        {
          message: /No exercises found for day/,
        }
      );
    });
  });
});
