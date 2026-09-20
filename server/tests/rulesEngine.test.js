require('dotenv').config();
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { generateCandidatePlan, GOAL_DEFAULTS } = require('../src/services/rulesEngine');
const { WorkoutTemplate } = require('../src/database/models');
const { seedWorkoutTemplates } = require('../src/database/seedWorkoutTemplates');

// Test database connection
before(async () => {
  const testDbUri =
    process.env.MONGODB_URI_TEST ||
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/gym-trainer-test';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testDbUri);
  }

  // Seed templates for testing
  await WorkoutTemplate.deleteMany({}); // Clean slate
  await seedWorkoutTemplates();
});

after(async () => {
  // Clean up
  await WorkoutTemplate.deleteMany({});
  await mongoose.connection.close();
});

describe('Workout Rules Engine', () => {
  describe('generateCandidatePlan', () => {
    it('beginner + 3 days → full_body', async () => {
      const profile = {
        trainingDaysPerWeek: 3,
        trainingExperience: 'beginner',
        fitnessGoal: 'muscle_gain',
      };

      const result = await generateCandidatePlan(profile);

      assert.equal(result.splitType, 'full_body');
      assert.ok(result.matchedTemplateId, 'Should match a template');
      assert.equal(result.days.length, 3);
      assert.ok(result.weeklyVolumeTarget > 0);
      assert.deepEqual(result.days[0].setsRepsRestRpeDefaults, {
        sets: GOAL_DEFAULTS.muscle_gain.sets,
        reps: GOAL_DEFAULTS.muscle_gain.reps,
        rest: GOAL_DEFAULTS.muscle_gain.restCompound,
        rpe: GOAL_DEFAULTS.muscle_gain.rpe,
      });
    });

    it('beginner + 4 days → full_body (override case)', async () => {
      const profile = {
        trainingDaysPerWeek: 4,
        trainingExperience: 'beginner',
        fitnessGoal: 'strength',
      };

      const result = await generateCandidatePlan(profile);

      // Critical test: beginner at 4 days should override to full_body, not upper_lower
      assert.equal(result.splitType, 'full_body', 'Beginner + 4 days must use full_body split');
      assert.ok(result.matchedTemplateId, 'Should match a template');
      assert.equal(result.days.length, 4);
    });

    it('intermediate + 4 days → upper_lower', async () => {
      const profile = {
        trainingDaysPerWeek: 4,
        trainingExperience: 'intermediate',
        fitnessGoal: 'fat_loss',
      };

      const result = await generateCandidatePlan(profile);

      assert.equal(result.splitType, 'upper_lower');
      assert.ok(result.matchedTemplateId, 'Should match a template');
      assert.equal(result.days.length, 4);
      assert.deepEqual(result.days[0].setsRepsRestRpeDefaults, {
        sets: GOAL_DEFAULTS.fat_loss.sets,
        reps: GOAL_DEFAULTS.fat_loss.reps,
        rest: GOAL_DEFAULTS.fat_loss.rest,
        rpe: GOAL_DEFAULTS.fat_loss.rpe,
      });
    });

    it('intermediate + 6 days → push_pull_legs', async () => {
      const profile = {
        trainingDaysPerWeek: 6,
        trainingExperience: 'intermediate',
        fitnessGoal: 'general_fitness',
      };

      const result = await generateCandidatePlan(profile);

      assert.equal(result.splitType, 'push_pull_legs');
      assert.ok(result.matchedTemplateId, 'Should match a template');
      assert.equal(result.days.length, 6);
      assert.deepEqual(result.days[0].setsRepsRestRpeDefaults, {
        sets: GOAL_DEFAULTS.general_fitness.sets,
        reps: GOAL_DEFAULTS.general_fitness.reps,
        rest: GOAL_DEFAULTS.general_fitness.rest,
        rpe: GOAL_DEFAULTS.general_fitness.rpe,
      });
    });

    it('invalid fitnessGoal → throws clear error', async () => {
      const profile = {
        trainingDaysPerWeek: 3,
        trainingExperience: 'beginner',
        fitnessGoal: 'invalid_goal_value',
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
  });
});
