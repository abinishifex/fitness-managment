#!/usr/bin/env node
/**
 * Manual smoke for Day 4 fallback + safety (no Mongo write).
 * Usage: node scripts/smokeFallbackPlan.js
 */
require('dotenv/config');

const {
  runDecisionWithFallback,
  createMockProvider,
  FALLBACK_REASON,
} = require('../server/src/ai');

const memberId = '507f1f77bcf86cd799439001';

const profile = {
  _id: memberId,
  age: 28,
  sex: 'male',
  fitnessGoal: 'muscle_gain',
  trainingExperience: 'intermediate',
  trainingDaysPerWeek: 4,
  sessionDurationMinutes: 60,
  equipmentAvailable: ['barbell', 'dumbbell', 'bench'],
  limitations: ['shoulder impingement'],
};

const catalog = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'Barbell Bench Press',
    primaryMuscles: ['chest'],
    equipmentRequired: ['barbell', 'bench'],
    type: 'compound',
    isApproved: true,
    contraindications: ['acute shoulder impingement'],
  },
  {
    _id: '507f1f77bcf86cd799439012',
    name: 'Landmine Press',
    primaryMuscles: ['shoulders'],
    equipmentRequired: ['barbell'],
    type: 'compound',
    isApproved: true,
    contraindications: [],
  },
];

const rules = {
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

async function main() {
  console.log('— AI success path —');
  const ok = await runDecisionWithFallback({
    memberId,
    profile,
    history: [],
    catalog,
    rules,
    provider: createMockProvider(),
    persist: false,
  });
  console.log({
    usedFallback: ok.usedFallback,
    source: ok.source,
    validatedBy: ok.validatedBy,
  });

  console.log('— Contract-fail fallback —');
  const bad = await runDecisionWithFallback({
    memberId,
    profile,
    history: [],
    catalog,
    rules,
    provider: createMockProvider({
      responseText: JSON.stringify({ reason: 'broken' }),
    }),
    persist: false,
  });
  console.log({
    usedFallback: bad.usedFallback,
    fallbackReason: bad.fallbackReason,
    expected: FALLBACK_REASON.AI_CONTRACT_FAIL,
    validatedBy: bad.planDraft?.validatedBy,
    safetyOk: bad.safety?.ok,
  });

  if (ok.usedFallback || ok.source !== 'ai') {
    console.error('success path smoke FAIL');
    process.exit(1);
  }
  if (
    !bad.usedFallback ||
    bad.fallbackReason !== FALLBACK_REASON.AI_CONTRACT_FAIL ||
    bad.planDraft?.validatedBy !== 'system'
  ) {
    console.error('fallback smoke FAIL');
    process.exit(1);
  }

  console.log('fallback smoke OK');
}

main().catch((err) => {
  console.error(err.code || err.status, err.message);
  process.exit(1);
});
