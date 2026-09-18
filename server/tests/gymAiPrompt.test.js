const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAiRequestPrompt,
  recommendSplit,
  normalizeIntake,
  GOAL_PRESCRIPTION,
} = require('../src/ai');

describe('GymAI research prompts', () => {
  it('maps beginner at 4 days to full_body', () => {
    assert.equal(
      recommendSplit({
        trainingDaysPerWeek: 4,
        trainingExperience: 'beginner',
        preferredSplit: 'let_ai_decide',
      }),
      'full_body'
    );
  });

  it('maps intermediate 4 days to upper_lower', () => {
    assert.equal(
      recommendSplit({
        trainingDaysPerWeek: 4,
        trainingExperience: 'intermediate',
        preferredSplit: 'let_ai_decide',
      }),
      'upper_lower'
    );
  });

  it('normalizes Build Muscle alias and builds a prompt with catalogue ids', () => {
    const intake = normalizeIntake({
      primaryGoal: 'Build Muscle',
      experience: 'intermediate',
      daysPerWeek: 4,
      sessionLength: 60,
      age: 30,
      priorityMuscleGroup: 'back',
      cardioInclusion: true,
      injuries: ['shoulder impingement'],
    });
    assert.equal(intake.fitnessGoal, 'muscle_gain');
    assert.equal(intake.cardioInclusion, true);

    const prompt = buildAiRequestPrompt({
      intake,
      catalogue: [{ id: '507f1f77bcf86cd799439011', name: 'Bench' }],
      candidatePlan: { days: [] },
    });

    assert.match(prompt, /INTAKE/);
    assert.match(prompt, /507f1f77bcf86cd799439011/);
    assert.match(prompt, /upper_lower|full_body|push_pull_legs/);
    assert.ok(GOAL_PRESCRIPTION.muscle_gain.rpe);
  });
});
