const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildStructuredPrompt,
  profileToIntake,
  normalizeCatalog,
  summarizeHistory,
  createMockProvider,
  runAiDecision,
  parseGatewayJson,
  extractJsonText,
} = require('../src/ai');
const { parseAiOutput } = require('../src/contracts/aiOutputContract');

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
  },
];

const sampleRules = {
  splitType: 'upper_lower',
  days: [
    {
      dayOfWeek: 'Monday',
      exercises: [
        {
          exerciseId: '507f1f77bcf86cd799439011',
          action: 'KEEP',
          sets: 3,
          reps: '8-12',
        },
      ],
    },
  ],
};

const sampleHistory = [
  {
    dayOfWeek: 'Monday',
    exerciseId: '507f1f77bcf86cd799439011',
    setsCompleted: [
      { setNumber: 1, weightKg: 60, reps: 10 },
      { setNumber: 2, weightKg: 60, reps: 9 },
    ],
    sessionCompleted: true,
    clientTimestamp: '2026-09-18T10:00:00.000Z',
  },
];

describe('prompt builder (profile + history + catalog + rules)', () => {
  it('profileToIntake maps MemberProfile fields', () => {
    const intake = profileToIntake(sampleProfile, { weekNumber: 5 });
    assert.equal(intake.fitnessGoal, 'muscle_gain');
    assert.equal(intake.weekNumber, 5);
    assert.deepEqual(intake.limitations, ['shoulder impingement']);
  });

  it('normalizeCatalog uses ObjectId strings', () => {
    const catalogue = normalizeCatalog(sampleCatalog);
    assert.equal(catalogue[0].id, '507f1f77bcf86cd799439011');
    assert.equal(catalogue[0].muscleGroup, 'chest');
  });

  it('summarizeHistory caps and flattens sets', () => {
    const summary = summarizeHistory(sampleHistory);
    assert.equal(summary.length, 1);
    assert.equal(summary[0].setsCompleted[0].reps, 10);
  });

  it('buildStructuredPrompt includes all four sections', () => {
    const { prompt, intake } = buildStructuredPrompt({
      profile: sampleProfile,
      history: sampleHistory,
      catalog: sampleCatalog,
      rules: sampleRules,
      weekNumber: 1,
    });

    assert.equal(intake.trainingDaysPerWeek, 4);
    assert.match(prompt, /INTAKE/);
    assert.match(prompt, /APPROVED EXERCISE CATALOGUE/);
    assert.match(prompt, /CANDIDATE PLAN/);
    assert.match(prompt, /RECENT WORKOUT HISTORY/);
    assert.match(prompt, /507f1f77bcf86cd799439011/);
    assert.match(prompt, /upper_lower/);
  });

  it('rejects missing profile', () => {
    assert.throws(
      () => buildStructuredPrompt({ catalog: sampleCatalog }),
      (err) => err.code === 'AI_BAD_REQUEST'
    );
  });
});

describe('AI Decision Engine', () => {
  it('extractJsonText strips markdown fences', () => {
    assert.equal(extractJsonText('```json\n{"a":1}\n```'), '{"a":1}');
  });

  it('parseGatewayJson handles invalid JSON', () => {
    const { raw, parseError } = parseGatewayJson('not-json');
    assert.ok(parseError);
    assert.equal(raw._unparsed, 'not-json');
  });

  it('runAiDecision validates mock output and persists AiDecision', async () => {
    const created = [];
    const FakeAiDecision = {
      async create(doc) {
        const row = { _id: 'dec1', ...doc };
        created.push(row);
        return row;
      },
    };

    const result = await runAiDecision({
      memberId: sampleProfile._id,
      profile: sampleProfile,
      history: sampleHistory,
      catalog: sampleCatalog,
      rules: sampleRules,
      provider: createMockProvider(),
      AiDecisionModel: FakeAiDecision,
    });

    assert.equal(result.validationResult.passed, true);
    assert.ok(result.parsed);
    assert.equal(result.provider, 'mock');
    assert.equal(created.length, 1);
    assert.equal(created[0].memberId, sampleProfile._id);
    assert.equal(created[0].validationResult.passed, true);
    assert.ok(created[0].promptSent.includes('INTAKE'));
    assert.equal(parseAiOutput(created[0].rawOutput).success, true);
  });

  it('runAiDecision persists failed validation when contract is violated', async () => {
    const created = [];
    const FakeAiDecision = {
      async create(doc) {
        created.push(doc);
        return doc;
      },
    };

    const badProvider = createMockProvider({
      responseText: JSON.stringify({ reason: 'missing adjustments only' }),
    });

    const result = await runAiDecision({
      memberId: sampleProfile._id,
      profile: sampleProfile,
      history: [],
      catalog: sampleCatalog,
      rules: sampleRules,
      provider: badProvider,
      AiDecisionModel: FakeAiDecision,
    });

    assert.equal(result.validationResult.passed, false);
    assert.equal(result.parsed, null);
    assert.equal(created[0].validationResult.passed, false);
    assert.match(created[0].validationResult.reason, /adjustment/i);
  });

  it('runAiDecision can skip persist', async () => {
    const result = await runAiDecision({
      memberId: sampleProfile._id,
      profile: sampleProfile,
      history: [],
      catalog: sampleCatalog,
      rules: sampleRules,
      provider: createMockProvider(),
      persist: false,
    });

    assert.equal(result.decision, null);
    assert.equal(result.validationResult.passed, true);
  });

  it('requires memberId', async () => {
    await assert.rejects(
      () =>
        runAiDecision({
          profile: sampleProfile,
          catalog: sampleCatalog,
          provider: createMockProvider(),
          persist: false,
        }),
      (err) => err.code === 'AI_BAD_REQUEST'
    );
  });
});
