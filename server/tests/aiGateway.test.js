const path = require('node:path');
// Load repo-root .env before skip checks (server/.env is optional).
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  generateCompletion,
  createProvider,
  createMockProvider,
  createGeminiProvider,
  clearModelCooldowns,
} = require('../src/ai');
const { parseAiOutput } = require('../src/contracts/aiOutputContract');
const { markCooldown } = require('../src/ai/providers/gemini');

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

  it('createProvider("gemini") fails without API key', () => {
    assert.throws(
      () =>
        createProvider({
          provider: 'gemini',
          apiKey: '',
          model: 'gemini-3.6-flash',
        }),
      /AI_API_KEY/
    );
  });
});

describe('Gemini model shifting', () => {
  beforeEach(() => {
    clearModelCooldowns();
  });

  it('shifts to the next model after a 429', async () => {
    const calls = [];
    const provider = createGeminiProvider({
      apiKey: 'test-key',
      models: ['gemini-3.6-flash', 'gemini-3.5-flash-lite'],
      cooldownMs: 60_000,
    });

    const originalFetch = global.fetch;
    global.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      calls.push(body.model);

      if (body.model === 'gemini-3.6-flash') {
        return {
          ok: false,
          status: 429,
          headers: { get: () => '1' },
          json: async () => ({ error: { message: 'Resource exhausted' } }),
        };
      }

      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({
          model: body.model,
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reason: 'ok',
                  adjustments: [
                    {
                      dayOfWeek: 'Monday',
                      exerciseId: '507f1f77bcf86cd799439011',
                      action: 'KEEP',
                      sets: 3,
                      reps: '8-12',
                    },
                  ],
                }),
              },
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      };
    };

    try {
      const result = await provider.complete({
        messages: [{ role: 'user', content: 'hi' }],
      });
      assert.equal(result.modelVersion, 'gemini-3.5-flash-lite');
      assert.deepEqual(calls, ['gemini-3.6-flash', 'gemini-3.5-flash-lite']);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('shifts past a retired (404) model', async () => {
    const calls = [];
    const provider = createGeminiProvider({
      apiKey: 'test-key',
      models: ['gemini-2.5-flash', 'gemini-3.6-flash'],
    });

    const originalFetch = global.fetch;
    global.fetch = async (_url, init) => {
      const body = JSON.parse(init.body);
      calls.push(body.model);

      if (body.model === 'gemini-2.5-flash') {
        return {
          ok: false,
          status: 404,
          headers: { get: () => null },
          json: async () => ({
            error: {
              message:
                'This model models/gemini-2.5-flash is no longer available to new users.',
            },
          }),
        };
      }

      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({
          model: body.model,
          choices: [
            {
              message: {
                content:
                  '{"reason":"x","adjustments":[{"dayOfWeek":"Monday","exerciseId":"1","action":"KEEP","sets":1,"reps":"5"}]}',
              },
            },
          ],
        }),
      };
    };

    try {
      const result = await provider.complete({
        messages: [{ role: 'user', content: 'hi' }],
      });
      assert.equal(result.modelVersion, 'gemini-3.6-flash');
      assert.deepEqual(calls, ['gemini-2.5-flash', 'gemini-3.6-flash']);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('skips models still on cooldown', async () => {
    markCooldown('gemini-3.6-flash', 60_000);

    const calls = [];
    const provider = createGeminiProvider({
      apiKey: 'test-key',
      models: ['gemini-3.6-flash', 'gemini-3.5-flash-lite'],
    });

    const originalFetch = global.fetch;
    global.fetch = async (_url, init) => {
      const body = JSON.parse(init.body);
      calls.push(body.model);
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({
          model: body.model,
          choices: [
            {
              message: {
                content:
                  '{"reason":"x","adjustments":[{"dayOfWeek":"Monday","exerciseId":"1","action":"KEEP","sets":1,"reps":"5"}]}',
              },
            },
          ],
        }),
      };
    };

    try {
      const result = await provider.complete({
        messages: [{ role: 'user', content: 'hi' }],
      });
      assert.equal(result.modelVersion, 'gemini-3.5-flash-lite');
      assert.deepEqual(calls, ['gemini-3.5-flash-lite']);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('uses a long cooldown for daily quota so the model is not re-hit', async () => {
    const {
      cooldownForError,
      isDailyQuotaExhausted,
      DAILY_QUOTA_COOLDOWN_MS,
      cooldownRemainingMs,
    } = require('../src/ai/providers/gemini');

    const err = new Error(
      'Resource exhausted: GenerateRequestsPerDayPerModel cap'
    );
    err.httpStatus = 429;
    err.code = 'AI_RATE_LIMIT';

    assert.equal(isDailyQuotaExhausted(err), true);
    assert.equal(cooldownForError(err, 60_000), DAILY_QUOTA_COOLDOWN_MS);

    markCooldown('gemini-3.6-flash', cooldownForError(err, 60_000));
    assert.ok(cooldownRemainingMs('gemini-3.6-flash') > 50 * 60 * 1000);
  });

  it('does not shorten an existing longer cooldown', () => {
    markCooldown('gemini-3.6-flash', 120_000);
    markCooldown('gemini-3.6-flash', 5_000);
    const { cooldownRemainingMs } = require('../src/ai/providers/gemini');
    assert.ok(cooldownRemainingMs('gemini-3.6-flash') > 60_000);
  });
});

describe('AI Gateway live (Gemini)', () => {
  it(
    'calls Gemini when AI_API_KEY is set',
    { skip: !process.env.AI_API_KEY || process.env.AI_PROVIDER === 'mock' },
    async (t) => {
      let result;
      try {
        result = await generateCompletion({
          prompt: [
            'Return a minimal valid AI Output Contract JSON.',
            'Use exerciseId "507f1f77bcf86cd799439011", action KEEP, Monday, sets 3, reps "8-12".',
          ].join(' '),
        });
      } catch (err) {
        const blob = `${err?.message || ''} ${err?.cause?.code || ''} ${err?.cause?.message || ''}`;
        if (/fetch failed|ETIMEDOUT|ENETUNREACH|ECONNREFUSED/i.test(blob)) {
          t.skip('Gemini unreachable from this network');
          return;
        }
        throw err;
      }

      assert.ok(result.text);
      const json = JSON.parse(result.text);
      const parsed = parseAiOutput(json);
      assert.equal(
        parsed.success,
        true,
        JSON.stringify(parsed.error?.issues || parsed)
      );
    }
  );
});
