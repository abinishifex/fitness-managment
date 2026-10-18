/**
 * WorkoutPlan schema — fitnessGoal enum coverage test.
 * No DB connection required: validateSync() is purely in-memory.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

// Import the model — this registers the schema but needs no live connection.
const WorkoutPlan = require('../src/database/models/WorkoutPlan');
const { FITNESS_GOAL_VALUES } = require('../src/config/constants');

// Minimal set of fields that satisfy all `required: true` constraints.
function minimalPlan(overrides = {}) {
  return new WorkoutPlan({
    memberId: new mongoose.Types.ObjectId(),
    templateId: new mongoose.Types.ObjectId(),
    splitType: 'full_body',
    trainingDaysPerWeek: 3,
    sessionDurationMinutes: 45,
    weeklyVolumeTarget: 60,
    days: [],
    validatedBy: 'system',
    ...overrides,
  });
}

describe('WorkoutPlan schema — fitnessGoal enum', () => {
  it('FITNESS_GOAL_VALUES contains calisthenics', () => {
    assert.ok(
      FITNESS_GOAL_VALUES.includes('calisthenics'),
      'calisthenics must be in FITNESS_GOAL_VALUES'
    );
  });

  for (const goal of FITNESS_GOAL_VALUES) {
    it(`fitnessGoal "${goal}" passes validateSync() with no error`, () => {
      const doc = minimalPlan({ fitnessGoal: goal });
      const err = doc.validateSync();
      // If there IS an error, check it is not about fitnessGoal
      if (err) {
        const paths = Object.keys(err.errors);
        assert.ok(
          !paths.includes('fitnessGoal'),
          `Unexpected fitnessGoal validation error for "${goal}": ${err.errors.fitnessGoal?.message}`
        );
      }
    });
  }

  it('unknown fitnessGoal fails validateSync() on the fitnessGoal path', () => {
    const doc = minimalPlan({ fitnessGoal: 'invalid_goal' });
    const err = doc.validateSync();
    assert.ok(err, 'Expected a validation error');
    assert.ok(
      err.errors.fitnessGoal,
      'Error should be on the fitnessGoal path'
    );
  });
});
