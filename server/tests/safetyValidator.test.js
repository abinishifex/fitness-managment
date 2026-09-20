const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  checkEquipment,
  checkApproved,
  checkLimitations,
  checkSessionDuration,
  checkVolume,
  limitationConflicts,
  indexCatalog,
  validateExercise,
  validateExercises,
  validatePlan,
  MAX_WEEKLY_SETS_PER_MUSCLE,
} = require('../src/safety/safetyValidator');

const bench = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Barbell Bench Press',
  isApproved: true,
  equipmentRequired: ['barbell', 'bench'],
  primaryMuscles: ['chest'],
  type: 'compound',
  contraindications: ['acute shoulder impingement', 'fresh pec strain'],
};

const landmine = {
  _id: '507f1f77bcf86cd799439012',
  name: 'Landmine Press',
  isApproved: true,
  equipmentRequired: ['barbell'],
  primaryMuscles: ['shoulders'],
  type: 'compound',
  contraindications: [],
};

const ohp = {
  _id: '507f1f77bcf86cd799439013',
  name: 'Overhead Press',
  isApproved: true,
  equipmentRequired: ['barbell'],
  primaryMuscles: ['shoulders'],
  type: 'compound',
  contraindications: ['shoulder impingement'],
};

describe('Safety Validator — isApproved', () => {
  it('passes approved exercises', () => {
    assert.deepEqual(checkApproved(bench), []);
  });

  it('rejects unapproved exercises', () => {
    const issues = checkApproved({ ...bench, isApproved: false });
    assert.equal(issues.length, 1);
    assert.equal(issues[0].code, 'not_approved');
  });
});

describe('Safety Validator — equipment', () => {
  it('passes when all required equipment is available', () => {
    const issues = checkEquipment(bench, ['barbell', 'bench', 'dumbbell']);
    assert.deepEqual(issues, []);
  });

  it('reports missing equipment', () => {
    const issues = checkEquipment(bench, ['dumbbell']);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].code, 'equipment');
    assert.deepEqual(issues[0].missingEquipment.sort(), ['barbell', 'bench']);
  });

  it('treats equipment "none" as always satisfied', () => {
    const issues = checkEquipment(
      { name: 'Plank', equipmentRequired: ['none', 'bodyweight'] },
      ['bodyweight']
    );
    assert.deepEqual(issues, []);
  });
});

describe('Safety Validator — limitations / contraindications', () => {
  it('matches phrase containment', () => {
    assert.equal(
      limitationConflicts('shoulder impingement', 'acute shoulder impingement'),
      true
    );
  });

  it('matches meaningful token overlap', () => {
    assert.equal(limitationConflicts('knee pain', 'acute knee flare'), true);
  });

  it('does not false-positive unrelated notes', () => {
    assert.equal(
      limitationConflicts('wrist mobility limits', 'acute low-back pain'),
      false
    );
  });

  it('flags contraindicated exercises for member limitations', () => {
    const issues = checkLimitations(bench, ['shoulder impingement']);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].code, 'limitation');
  });

  it('passes when no conflict', () => {
    assert.deepEqual(checkLimitations(landmine, ['shoulder impingement']), []);
  });
});

describe('Safety Validator — volume limits', () => {
  it('flags weekly over-volume per muscle', () => {
    const catalogById = indexCatalog([bench]);
    const days = [
      {
        dayOfWeek: 'Monday',
        exercises: [{ exerciseId: bench._id, sets: 14, action: 'KEEP' }],
      },
      {
        dayOfWeek: 'Thursday',
        exercises: [{ exerciseId: bench._id, sets: 14, action: 'KEEP' }],
      },
    ];
    const issues = checkVolume(days, catalogById, {
      trainingExperience: 'intermediate',
    });
    assert.ok(issues.some((i) => i.code === 'volume' && i.muscle === 'chest'));
    assert.ok(
      issues.some((i) => i.sets > MAX_WEEKLY_SETS_PER_MUSCLE)
    );
  });

  it('flags unrealistic session set density', () => {
    const catalogById = indexCatalog([bench, landmine]);
    const days = [
      {
        dayOfWeek: 'Monday',
        exercises: [
          { exerciseId: bench._id, sets: 12, action: 'KEEP' },
          { exerciseId: landmine._id, sets: 12, action: 'KEEP' },
        ],
      },
    ];
    const issues = checkVolume(days, catalogById, {
      trainingExperience: 'beginner',
    });
    assert.ok(issues.some((i) => i.code === 'volume' && i.dayOfWeek === 'Monday'));
  });

  it('ignores REMOVE rows', () => {
    const catalogById = indexCatalog([bench]);
    const issues = checkVolume(
      [
        {
          dayOfWeek: 'Monday',
          exercises: [{ exerciseId: bench._id, sets: 40, action: 'REMOVE' }],
        },
      ],
      catalogById
    );
    assert.deepEqual(issues, []);
  });
});

describe('Safety Validator — session-duration realism', () => {
  it('passes a short day within budget', () => {
    const catalogById = indexCatalog([bench]);
    const issues = checkSessionDuration(
      {
        dayOfWeek: 'Monday',
        exercises: [
          {
            exerciseId: bench._id,
            sets: 3,
            restSeconds: 90,
            action: 'KEEP',
          },
        ],
      },
      60,
      catalogById
    );
    assert.deepEqual(issues, []);
  });

  it('flags an overlong session', () => {
    const catalogById = indexCatalog([bench]);
    const issues = checkSessionDuration(
      {
        dayOfWeek: 'Monday',
        exercises: [
          {
            exerciseId: bench._id,
            sets: 12,
            restSeconds: 300,
            action: 'KEEP',
          },
        ],
      },
      30,
      catalogById
    );
    assert.equal(issues.length, 1);
    assert.equal(issues[0].code, 'session_duration');
    assert.ok(issues[0].estimatedMinutes > 30);
  });
});

describe('Safety Validator — validateExercise / validateExercises', () => {
  it('aggregates approval and equipment failures', () => {
    const result = validateExercise(
      { ...bench, isApproved: false },
      { equipmentAvailable: ['bodyweight'] }
    );
    assert.equal(result.ok, false);
    assert.equal(result.issues.length, 2);
    assert.deepEqual(result.issues.map((i) => i.code).sort(), [
      'equipment',
      'not_approved',
    ]);
  });

  it('includes limitation conflicts when provided', () => {
    const result = validateExercise(ohp, {
      equipmentAvailable: ['barbell'],
      limitations: ['shoulder impingement'],
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.code === 'limitation'));
  });

  it('validates a list of exercises', () => {
    const result = validateExercises(
      [bench, { ...bench, name: 'Push-Up', equipmentRequired: ['bodyweight'], contraindications: [] }],
      { equipmentAvailable: ['barbell', 'bench', 'bodyweight'] }
    );
    assert.equal(result.ok, true);
    assert.equal(result.issues.length, 0);
  });
});

describe('Safety Validator — validatePlan', () => {
  const catalog = [bench, landmine, ohp];

  it('passes a safe rules-only draft', () => {
    const result = validatePlan(
      {
        sessionDurationMinutes: 60,
        days: [
          {
            dayOfWeek: 'Monday',
            exercises: [
              {
                exerciseId: landmine._id,
                action: 'KEEP',
                sets: 3,
                reps: '8-12',
                restSeconds: 120,
              },
            ],
          },
        ],
      },
      {
        catalog,
        equipmentAvailable: ['barbell'],
        limitations: ['shoulder impingement'],
        trainingExperience: 'intermediate',
      }
    );
    assert.equal(result.ok, true);
  });

  it('rejects contraindicated OHP in a plan', () => {
    const result = validatePlan(
      {
        sessionDurationMinutes: 60,
        days: [
          {
            dayOfWeek: 'Monday',
            exercises: [
              {
                exerciseId: ohp._id,
                action: 'KEEP',
                sets: 3,
                reps: '6-10',
                restSeconds: 120,
              },
            ],
          },
        ],
      },
      {
        catalog,
        equipmentAvailable: ['barbell'],
        limitations: ['shoulder impingement'],
        trainingExperience: 'intermediate',
      }
    );
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.code === 'limitation'));
  });

  it('rejects unknown exercise ids', () => {
    const result = validatePlan(
      {
        days: [
          {
            dayOfWeek: 'Monday',
            exercises: [{ exerciseId: 'missing', action: 'KEEP', sets: 3 }],
          },
        ],
      },
      { catalog, equipmentAvailable: ['barbell'] }
    );
    assert.ok(result.issues.some((i) => i.code === 'unknown_exercise'));
  });

  it('validates AI adjustments shape', () => {
    const result = validatePlan(
      {
        adjustments: [
          {
            dayOfWeek: 'Monday',
            exerciseId: bench._id,
            action: 'KEEP',
            sets: 3,
            reps: '8-12',
            restSeconds: 90,
          },
        ],
      },
      {
        catalog,
        equipmentAvailable: ['barbell', 'bench'],
        sessionDurationMinutes: 60,
        trainingExperience: 'intermediate',
      }
    );
    assert.equal(result.ok, true);
  });
});
