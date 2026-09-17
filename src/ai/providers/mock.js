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
    reason: 'Mock provider: keep candidate plan structure with minor volume trim.',
    adjustments: [
      {
        dayOfWeek: 'Monday',
        exerciseId: '507f1f77bcf86cd799439011',
        action: 'KEEP',
        sets: 3,
        reps: '8-12',
        rpe: 7,
        restSeconds: 90,
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
