const { env } = require('../config/env');
const { createOpenAiCompatibleProvider } = require('./providers/openaiCompatible');
const { createMockProvider } = require('./providers/mock');
const { createGeminiProvider } = require('./providers/gemini');
const {
  GYMAI_SYSTEM_PROMPT,
  buildAiRequestPrompt,
  buildStructuredPrompt,
} = require('./prompts/gymAi');

/** GymAI research-backed system prompt (intake → plan columns). */
const DEFAULT_SYSTEM_PROMPT = GYMAI_SYSTEM_PROMPT;

/**
 * Resolve a concrete provider. Providers are swappable via AI_PROVIDER env:
 *   - gemini (default) — Google Gemini with model shifting on rate limits
 *   - groq — Llama via Groq OpenAI-compatible API
 *   - openai_compatible — any host using AI_BASE_URL / AI_MODEL / AI_API_KEY
 *   - mock — offline fixture for tests
 */
function createProvider(overrides = {}) {
  const providerName = (overrides.provider || env.aiProvider || 'gemini').toLowerCase();
  const apiKey = overrides.apiKey ?? env.aiApiKey;
  const baseUrl = overrides.baseUrl ?? env.aiBaseUrl;
  const model = overrides.model ?? env.aiModel;
  const models = overrides.models ?? env.aiModels;
  const timeoutMs = overrides.timeoutMs ?? env.aiTimeoutMs;

  if (providerName === 'mock') {
    return createMockProvider({ model });
  }

  if (providerName === 'gemini') {
    return createGeminiProvider({
      apiKey,
      baseUrl:
        baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: model || 'gemini-3.6-flash',
      models,
      timeoutMs,
    });
  }

  if (providerName === 'groq' || providerName === 'openai_compatible') {
    return createOpenAiCompatibleProvider({
      name: providerName,
      apiKey,
      baseUrl:
        baseUrl ||
        (providerName === 'groq' ? 'https://api.groq.com/openai/v1' : baseUrl),
      model: model || 'llama-3.3-70b-versatile',
      timeoutMs,
    });
  }

  throw new Error(
    `Unknown AI_PROVIDER "${providerName}". Use gemini | groq | openai_compatible | mock.`
  );
}

/**
 * AI Gateway — single entry point for model calls.
 *
 * Signature is stable; only the provider underneath changes.
 *
 * @param {{
 *   prompt: string,
 *   systemPrompt?: string,
 *   temperature?: number,
 *   maxTokens?: number,
 *   timeoutMs?: number,
 *   jsonMode?: boolean,
 *   provider?: object,
 * }} input
 * @returns {Promise<{
 *   text: string,
 *   modelVersion: string,
 *   provider: string,
 *   latencyMs: number,
 *   usage?: { promptTokens?: number, completionTokens?: number, totalTokens?: number },
 * }>}
 */
async function generateCompletion({
  prompt,
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
  temperature = 0.2,
  maxTokens = 2048,
  timeoutMs,
  jsonMode = true,
  provider,
} = {}) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    const err = new Error('generateCompletion requires a non-empty prompt');
    err.status = 400;
    err.code = 'AI_BAD_REQUEST';
    throw err;
  }

  const active = provider || createProvider();
  const started = Date.now();

  const result = await active.complete({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature,
    maxTokens,
    timeoutMs,
    jsonMode,
  });

  return {
    text: result.text,
    modelVersion: result.modelVersion || active.model,
    provider: active.name,
    latencyMs: Date.now() - started,
    usage: result.usage,
  };
}

module.exports = {
  DEFAULT_SYSTEM_PROMPT,
  GYMAI_SYSTEM_PROMPT,
  buildAiRequestPrompt,
  buildStructuredPrompt,
  createProvider,
  generateCompletion,
};
