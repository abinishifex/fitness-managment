#!/usr/bin/env node
/**
 * Manual smoke for Day 3 Decision Engine (no Mongo write unless MONGODB_URI set).
 * Usage: node scripts/smokeDecisionEngine.js
 */
require('dotenv/config');

const {
  runAiDecision,
  createMockProvider,
  createProvider,
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
  equipmentAvailable: ['barbell', 'dumbbell', 'bench', 'cable_machine'],
  priorityMuscleGroup: 'back',
  limitations: ['shoulder impingement'],
};

const catalog = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'Barbell Bench Press',
    primaryMuscles: ['chest'],
    equipmentRequired: ['barbell', 'bench'],
    movementPattern: 'horizontal_press',
    type: 'compound',
    difficulty: 'intermediate',
  },
  {
    _id: '507f1f77bcf86cd799439012',
    name: 'Landmine Press',
    primaryMuscles: ['shoulders'],
    equipmentRequired: ['barbell'],
    movementPattern: 'vertical_press',
    type: 'compound',
    difficulty: 'intermediate',
  },
  {
    _id: '507f1f77bcf86cd799439013',
    name: 'Overhead Press',
    primaryMuscles: ['shoulders'],
    equipmentRequired: ['barbell'],
    movementPattern: 'vertical_press',
    type: 'compound',
    difficulty: 'intermediate',
  },
];

const rules = {
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
        {
          exerciseId: '507f1f77bcf86cd799439013',
          action: 'KEEP',
          sets: 3,
          reps: '6-10',
        },
      ],
    },
  ],
};

async function main() {
  const useLive = Boolean(process.env.AI_API_KEY) && process.env.AI_PROVIDER !== 'mock';
  const provider = useLive ? createProvider() : createMockProvider();

  console.log('provider=', useLive ? process.env.AI_PROVIDER || 'gemini' : 'mock');
  console.log('persist=false (smoke does not write AiDecision)');

  const result = await runAiDecision({
    memberId,
    profile,
    history: [],
    catalog,
    rules,
    provider,
    persist: false,
    extraInstructions:
      'Prefer SWAP Overhead Press → Landmine Press for shoulder impingement.',
  });

  console.log({
    modelVersion: result.modelVersion,
    provider: result.provider,
    latencyMs: result.latencyMs,
    validationPassed: result.validationResult.passed,
    reason: result.validationResult.reason,
  });

  if (!result.validationResult.passed) {
    console.error('contract FAIL', result.rawOutput);
    process.exit(1);
  }

  console.log('contract OK');
  console.log(
    'rows=',
    result.parsed.adjustments.map((a) => ({
      day: a.dayOfWeek,
      action: a.action,
      exerciseId: a.exerciseId,
      sets: a.sets,
      reps: a.reps,
      substitutionNote: a.substitutionNote,
    }))
  );
}

main().catch((err) => {
  console.error(err.code || err.status, err.message);
  process.exit(1);
});
