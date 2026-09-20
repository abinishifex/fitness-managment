const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createMockProvider,
  runAiDecision,
  buildRulesOnlyPlan,
  runDecisionWithFallback,
  FALLBACK_REASON,
} = require('../src/ai');

const sampleProfile = {
  _id: '507f1f77bcf86cd799439001',
  age: 28,
  sex: 'male',
  fitnessGoal: 'muscle_gain',
  trainingExperience: 'intermediate',
  trainingDaysPerWeek: 4,
  sessionDurationMinutes: 60,
  equipmentAvailable: ['barbell', 'dumbbell', 'bench'],
  priorityMuscleGroup: 'back',
  limitations: ['shoulder impingement'],
};

const sampleCatalog = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'Barbell Bench Press',
    primaryMuscles: ['chest'],
    equipmentRequired: ['barbell', 'bench'],
    movementPattern: 'horizontal_press',
    type: 'compound',
    difficulty: 'intermediate',
    isApproved: true,
    contraindications: ['acute shoulder impingement'],
  },
  {
    _id: '507f1f77bcf86cd799439012',
    name: 'Landmine Press',
    primaryMuscles: ['shoulders'],
    equipmentRequired: ['barbell'],
    movementPattern: 'vertical_press',
    type: 'compound',
    difficulty: 'intermediate',
    isApproved: true,
    contraindications: [],
  },
];

const sampleRules = {
  splitType: 'upper_lower',
  templateId: '507f1f77bcf86cd799439099',
  weeklyVolumeTarget: { chest: 12, shoulders: 10 },
  days: [
    {
      dayOfWeek: 'Monday',
      exercises: [
        {
          exerciseId: '507f1f77bcf86cd799439012',
          action: 'KEEP',
          sets: 3,
          reps: '8-12',
          restSeconds: 120,
        },
      ],
    },
  ],
};

describe('buildRulesOnlyPlan', () => {
  it('produces a system-validated rules-only draft', () => {
    const draft = buildRulesOnlyPlan({
      memberId: sampleProfile._id,
      rules: sampleRules,
      profile: sampleProfile,
      fallbackReason: FALLBACK_REASON.AI_TIMEOUT,
    });

    assert.equal(draft.validatedBy, 'system');
    assert.equal(draft.source, 'rules_fallback');
    assert.equal(draft.status, 'validated');
    assert.equal(draft.isActive, false);
    assert.equal(draft.splitType, 'upper_lower');
    assert.equal(draft.fallbackReason, FALLBACK_REASON.AI_TIMEOUT);
    assert.equal(draft.days[0].exercises[0].exerciseId, '507f1f77bcf86cd799439012');
    assert.match(draft.aiReason, /Rules-only fallback/i);
  });

  it('requires rules.days', () => {
    assert.throws(
      () =>
        buildRulesOnlyPlan({
          memberId: sampleProfile._id,
          rules: {},
          fallbackReason: FALLBACK_REASON.AI_ERROR,
        }),
      (err) => err.code === 'AI_BAD_REQUEST'
    );
  });
});

describe('runDecisionWithFallback', () => {
  it('returns AI source when decision passes', async () => {
    const result = await runDecisionWithFallback({
      memberId: sampleProfile._id,
      profile: sampleProfile,
      history: [],
      catalog: sampleCatalog,
      rules: sampleRules,
      provider: createMockProvider(),
      persist: false,
    });

    assert.equal(result.usedFallback, false);
    assert.equal(result.source, 'ai');
    assert.equal(result.validatedBy, 'system');
    assert.equal(result.planDraft, null);
    assert.equal(result.ai.validationResult.passed, true);
  });

  it('falls back on contract failure', async () => {
    const badProvider = createMockProvider({
      responseText: JSON.stringify({ reason: 'missing adjustments' }),
    });

    const result = await runDecisionWithFallback({
      memberId: sampleProfile._id,
      profile: sampleProfile,
      history: [],
      catalog: sampleCatalog,
      rules: sampleRules,
      provider: badProvider,
      persist: false,
    });

    assert.equal(result.usedFallback, true);
    assert.equal(result.source, 'rules_fallback');
    assert.equal(result.fallbackReason, FALLBACK_REASON.AI_CONTRACT_FAIL);
    assert.equal(result.validatedBy, 'system');
    assert.ok(result.planDraft);
    assert.equal(result.planDraft.validatedBy, 'system');
    assert.equal(result.planDraft.days.length, 1);
    assert.equal(result.safety.ok, true);
  });

  it('falls back on AI timeout', async () => {
    const timeoutProvider = {
      name: 'mock-timeout',
      model: 'mock-timeout-v1',
      async complete() {
        const err = new Error('AI request timed out after 1ms');
        err.status = 504;
        err.code = 'AI_TIMEOUT';
        throw err;
      },
    };

    const created = [];
    const FakeAiDecision = {
      async create(doc) {
        const row = { _id: 'dec-timeout', ...doc };
        created.push(row);
        return row;
      },
    };

    const result = await runDecisionWithFallback({
      memberId: sampleProfile._id,
      profile: sampleProfile,
      history: [],
      catalog: sampleCatalog,
      rules: sampleRules,
      provider: timeoutProvider,
      AiDecisionModel: FakeAiDecision,
      persist: true,
    });

    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, FALLBACK_REASON.AI_TIMEOUT);
    assert.equal(result.planDraft.validatedBy, 'system');
    assert.equal(created.length, 1);
    assert.equal(created[0].validationResult.passed, false);
    assert.match(created[0].validationResult.reason, /timeout/i);
    assert.equal(result.planDraft.aiDecisionId, 'dec-timeout');
  });

  it('falls back on provider error', async () => {
    async function failingDecision() {
      const err = new Error('provider down');
      err.code = 'AI_PROVIDER_ERROR';
      err.status = 503;
      throw err;
    }

    const result = await runDecisionWithFallback({
      memberId: sampleProfile._id,
      profile: sampleProfile,
      catalog: sampleCatalog,
      rules: sampleRules,
      runDecision: failingDecision,
      persist: false,
    });

    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, FALLBACK_REASON.AI_ERROR);
    assert.equal(result.validatedBy, 'system');
  });

  it('requires rules.days', async () => {
    await assert.rejects(
      () =>
        runDecisionWithFallback({
          memberId: sampleProfile._id,
          profile: sampleProfile,
          catalog: sampleCatalog,
          rules: { splitType: 'full_body' },
          persist: false,
        }),
      (err) => err.code === 'AI_BAD_REQUEST'
    );
  });
});

describe('runAiDecision — gateway failure persistence', () => {
  it('persists failed AiDecision then rethrows on timeout', async () => {
    const created = [];
    const FakeAiDecision = {
      async create(doc) {
        created.push(doc);
        return { _id: 'dec-fail', ...doc };
      },
    };

    const timeoutProvider = {
      name: 'mock-timeout',
      model: 'mock-timeout-v1',
      async complete() {
        const err = new Error('timed out');
        err.code = 'AI_TIMEOUT';
        err.status = 504;
        throw err;
      },
    };

    await assert.rejects(
      () =>
        runAiDecision({
          memberId: sampleProfile._id,
          profile: sampleProfile,
          history: [],
          catalog: sampleCatalog,
          rules: sampleRules,
          provider: timeoutProvider,
          AiDecisionModel: FakeAiDecision,
        }),
      (err) => err.code === 'AI_TIMEOUT' && err.aiDecision?._id === 'dec-fail'
    );

    assert.equal(created.length, 1);
    assert.equal(created[0].validationResult.passed, false);
  });
});
