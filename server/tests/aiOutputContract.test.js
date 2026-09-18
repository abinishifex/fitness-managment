const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseAiOutput,
  aiOutputJsonSchema,
  ADJUSTMENT_ACTIONS,
} = require('./contracts/aiOutputContract');

const validPayload = {
  reason: 'Keep compound lifts; swap machine fly for DB fly given available equipment.',
  adjustments: [
    {
      dayOfWeek: 'Monday',
      exerciseId: '507f1f77bcf86cd799439011',
      action: 'KEEP',
      sets: 4,
      reps: '6-8',
      rpe: 8,
      restSeconds: 120,
    },
    {
      dayOfWeek: 2,
      exerciseId: '507f1f77bcf86cd799439012',
      replaceExerciseId: '507f1f77bcf86cd799439013',
      action: 'SWAP',
      sets: 3,
      reps: '10-12',
    },
  ],
};

describe('AI Output Contract (Section 8)', () => {
  it('accepts a valid payload', () => {
    const result = parseAiOutput(validPayload);
    assert.equal(result.success, true);
    assert.equal(result.data.adjustments.length, 2);
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
