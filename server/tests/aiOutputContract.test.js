const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseAiOutput,
  aiOutputJsonSchema,
  ADJUSTMENT_ACTIONS,
} = require('../src/contracts/aiOutputContract');

const validPayload = {
  reason: 'Keep compound lifts; swap machine fly for DB fly given available equipment.',
  adjustments: [
    {
      dayOfWeek: 'Monday',
      exerciseId: '507f1f77bcf86cd799439011',
      action: 'KEEP',
      sets: 4,
      reps: '6-8',
      formCue: 'Tuck elbows ~45°; pause on chest.',
      rpe: 8,
      restSeconds: 120,
      progressionCue:
        'Increase weight next session if you hit the top of the rep range with 1–2 reps in reserve.',
    },
    {
      dayOfWeek: 2,
      exerciseId: '507f1f77bcf86cd799439012',
      replaceExerciseId: '507f1f77bcf86cd799439013',
      action: 'SWAP',
      sets: 3,
      reps: '10-12',
      rpe: 7,
      restSeconds: 90,
      substitutionNote:
        'Landmine Press used in place of Overhead Press (shoulder note).',
    },
  ],
};

describe('AI Output Contract (Section 8)', () => {
  it('accepts a valid payload', () => {
    const result = parseAiOutput(validPayload);
    assert.equal(result.success, true);
    assert.equal(result.data.adjustments.length, 2);
  });

  it('coerces string rpe / sets / restSeconds from the model', () => {
    const result = parseAiOutput({
      reason: 'Hypertrophy keep with numeric strings from the model.',
      adjustments: [
        {
          dayOfWeek: 'Monday',
          exerciseId: '507f1f77bcf86cd799439011',
          action: 'KEEP',
          sets: '3',
          reps: '8-12',
          rpe: '8',
          restSeconds: '90',
        },
      ],
    });
    assert.equal(result.success, true);
    assert.equal(result.data.adjustments[0].rpe, 8);
    assert.equal(result.data.adjustments[0].sets, 3);
    assert.equal(result.data.adjustments[0].restSeconds, 90);
  });

  it('rejects missing reason', () => {
    const rest = { adjustments: validPayload.adjustments };
    const result = parseAiOutput(rest);
    assert.equal(result.success, false);
  });

  it('rejects empty adjustments', () => {
    const result = parseAiOutput({ reason: 'x', adjustments: [] });
    assert.equal(result.success, false);
  });

  it('rejects unknown action', () => {
    const result = parseAiOutput({
      reason: 'x',
      adjustments: [
        {
          dayOfWeek: 'Monday',
          exerciseId: 'abc',
          action: 'MODIFY',
          sets: 3,
          reps: '10',
        },
      ],
    });
    assert.equal(result.success, false);
  });

  it('rejects unknown top-level keys (strict)', () => {
    const result = parseAiOutput({ ...validPayload, extra: true });
    assert.equal(result.success, false);
  });

  it('exports matching action enum + JSON schema', () => {
    assert.deepEqual(ADJUSTMENT_ACTIONS, ['KEEP', 'SWAP', 'ADD', 'REMOVE']);
    assert.equal(aiOutputJsonSchema.required.includes('reason'), true);
    assert.equal(aiOutputJsonSchema.required.includes('adjustments'), true);
  });
});
