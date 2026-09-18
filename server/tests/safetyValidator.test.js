const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  checkEquipment,
  checkApproved,
  validateExercise,
  validateExercises,
} = require('../src/safety/safetyValidator');

const bench = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Barbell Bench Press',
  isApproved: true,
  equipmentRequired: ['barbell', 'bench'],
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

  it('validates a list of exercises', () => {
    const result = validateExercises(
      [bench, { ...bench, name: 'Push-Up', equipmentRequired: ['bodyweight'] }],
      { equipmentAvailable: ['barbell', 'bench', 'bodyweight'] }
    );
    assert.equal(result.ok, true);
    assert.equal(result.issues.length, 0);
  });
});
