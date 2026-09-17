const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  generateCompletion,
  createProvider,
  createMockProvider,
} = require('../src/ai');
const { parseAiOutput } = require('../src/contracts/aiOutputContract');

describe('AI Gateway', () => {
  it('generateCompletion returns text from the mock provider', async () => {
    const mock = createMockProvider();
    const result = await generateCompletion({
      prompt: 'Candidate plan: ... catalogue: ...',
      provider: mock,
    });

    assert.equal(result.provider, 'mock');
    assert.equal(typeof result.text, 'string');
    assert.equal(typeof result.latencyMs, 'number');
    assert.ok(result.modelVersion);

    const parsed = parseAiOutput(JSON.parse(result.text));
    assert.equal(parsed.success, true);
  });

  it('rejects empty prompt', async () => {
    await assert.rejects(
      () => generateCompletion({ prompt: '  ', provider: createMockProvider() }),
      (err) => err.code === 'AI_BAD_REQUEST'
    );
  });

  it('createProvider("mock") works without API key', () => {
    const provider = createProvider({ provider: 'mock' });
    assert.equal(provider.name, 'mock');
  });

  it('createProvider("groq") fails without API key', () => {
    assert.throws(
      () =>
        createProvider({
          provider: 'groq',
          apiKey: '',
          baseUrl: 'https://api.groq.com/openai/v1',
          model: 'llama-3.3-70b-versatile',
        }),
      /AI_API_KEY/
    );
  });
});

describe('AI Gateway live (optional)', () => {
  it('calls Groq when AI_API_KEY is set', { skip: !process.env.AI_API_KEY }, async () => {
    const result = await generateCompletion({
      prompt: [
        'Return a minimal valid AI Output Contract JSON.',
        'Use exerciseId "507f1f77bcf86cd799439011", action KEEP, Monday, sets 3, reps "8-12".',
      ].join(' '),
    });

    assert.ok(result.text);
    const json = JSON.parse(result.text);
    const parsed = parseAiOutput(json);
    assert.equal(parsed.success, true, JSON.stringify(parsed.error?.issues || parsed));
  });
});
