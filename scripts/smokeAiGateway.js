#!/usr/bin/env node
/**
 * Manual smoke test for the AI Gateway (GymAI research request/response).
 * Usage: node scripts/smokeAiGateway.js
 */
require('dotenv/config');

const {
  generateCompletion,
  buildAiRequestPrompt,
} = require('../src/ai');
const { parseAiOutput } = require('../src/contracts/aiOutputContract');

const sampleIntake = {
  age: 28,
  sex: 'male',
  fitnessGoal: 'muscle_gain',
  trainingExperience: 'intermediate',
  trainingDaysPerWeek: 4,
  sessionDurationMinutes: 60,
  equipmentAvailable: ['barbell', 'dumbbell', 'bench', 'cable_machine'],
  preferredSplit: 'let_ai_decide',
  priorityMuscleGroup: 'back',
  cardioInclusion: false,
  limitations: ['shoulder impingement'],
  weekNumber: 1,
};

const sampleCatalogue = [
  {
    id: '507f1f77bcf86cd799439011',
    name: 'Barbell Bench Press',
    muscleGroup: 'chest',
    equipment: 'barbell',
    movementPattern: 'horizontal_press',
  },
  {
    id: '507f1f77bcf86cd799439012',
    name: 'Landmine Press',
    muscleGroup: 'shoulders',
    equipment: 'barbell',
    movementPattern: 'vertical_press',
  },
  {
    id: '507f1f77bcf86cd799439013',
    name: 'Overhead Press',
    muscleGroup: 'shoulders',
    equipment: 'barbell',
    movementPattern: 'vertical_press',
  },
  {
    id: '507f1f77bcf86cd799439014',
    name: 'Chest-Supported Row',
    muscleGroup: 'back',
    equipment: 'dumbbell',
    movementPattern: 'horizontal_pull',
  },
];

const sampleCandidate = {
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
        {
          exerciseId: '507f1f77bcf86cd799439014',
          action: 'KEEP',
          sets: 3,
          reps: '8-12',
        },
      ],
    },
  ],
};

async function main() {
  if (!process.env.AI_API_KEY) {
    console.error('Missing AI_API_KEY in .env');
    process.exit(1);
  }

  const prompt = buildAiRequestPrompt({
    intake: sampleIntake,
    catalogue: sampleCatalogue,
    candidatePlan: sampleCandidate,
    extraInstructions:
      'Prefer SWAP Overhead Press → Landmine Press because of shoulder impingement; boost back volume slightly.',
  });

  console.log('provider=', process.env.AI_PROVIDER || 'gemini');
  console.log('model=', process.env.AI_MODEL);
  console.log('calling with GymAI intake prompt…');

  const { text, modelVersion, provider, latencyMs } = await generateCompletion({
    prompt,
    maxTokens: 4096,
  });

  console.log({ provider, modelVersion, latencyMs });
  console.log(text);

  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    console.error('JSON parse FAIL', err.message);
    process.exit(1);
  }

  const parsed = parseAiOutput(json);
  if (!parsed.success) {
    console.error('contract FAIL', parsed.error);
    process.exit(1);
  }

  console.log('contract OK');
  console.log(
    'rows=',
    parsed.data.adjustments.map((a) => ({
      day: a.dayOfWeek,
      action: a.action,
      sets: a.sets,
      reps: a.reps,
      rpe: a.rpe,
      restSeconds: a.restSeconds,
      substitutionNote: a.substitutionNote,
    }))
  );
}

main().catch((err) => {
  console.error(err.code || err.status, err.message);
  process.exit(1);
});
