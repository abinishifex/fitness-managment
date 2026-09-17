/**
 * Deterministic mock provider for unit tests / CI (no network).
 * Returns a valid Section 8 AI Output Contract payload as JSON text.
 */
function createMockProvider({
  name = 'mock',
  model = 'mock-ai-v1',
  responseText,
} = {}) {
  const defaultResponse = JSON.stringify({
    reason:
      'Mock provider: hypertrophy defaults (3–4 sets, RPE 7–9); keep candidate compounds.',
    adjustments: [
      {
        dayOfWeek: 'Monday',
        exerciseId: '507f1f77bcf86cd799439011',
        action: 'KEEP',
        sets: 3,
        reps: '8-12',
        formCue: 'Brace ribs down; control the eccentric.',
        rpe: 8,
        restSeconds: 120,
        progressionCue:
          'Increase weight next session if you hit the top of the rep range with 1–2 reps in reserve.',
      },
    ],
  });

  return {
    name,
    model,

    async complete({ messages }) {
      if (!Array.isArray(messages) || messages.length === 0) {
        const err = new Error('mock provider requires messages');
        err.status = 400;
        err.code = 'AI_BAD_REQUEST';
        throw err;
      }

      return {
        text: responseText || defaultResponse,
        modelVersion: model,
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      };
    },
  };
}

module.exports = { createMockProvider };
