/**
 * Gemini provider with automatic model shifting on rate limits / unavailable models.
 *
 * Uses Google's OpenAI-compatible endpoint so the chat/completions shape stays
 * consistent with other providers. When a model is rate-limited, overloaded, or
 * retired (404), it is put on cooldown and the next model in AI_MODELS is tried.
 */
const { createOpenAiCompatibleProvider } = require('./openaiCompatible');

const DEFAULT_GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
];

const DEFAULT_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai';

/** @type {Map<string, number>} model -> cooldown expiry (epoch ms) */
const modelCooldowns = new Map();

const DEFAULT_COOLDOWN_MS = 60_000;
/** Retired / not-found models stay skipped for a long time. */
const UNAVAILABLE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
/** Overload (503) — shorter shift window. */
const OVERLOAD_COOLDOWN_MS = 30_000;

function parseModels(models) {
  if (Array.isArray(models) && models.length > 0) {
    return models.map((m) => String(m).trim()).filter(Boolean);
  }
  if (typeof models === 'string' && models.trim()) {
    return models
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
  }
  return [...DEFAULT_GEMINI_MODELS];
}

function isRateLimited(err) {
  return (
    err?.code === 'AI_RATE_LIMIT' ||
    err?.status === 429 ||
    err?.httpStatus === 429 ||
    /rate.?limit|quota|resource.?exhausted|too many requests/i.test(
      err?.message || ''
    )
  );
}

function isModelUnavailable(err) {
  const http = err?.httpStatus ?? err?.status;
  if (http === 404) return true;
  return /no longer available|NOT_FOUND|model .* not found|is not found/i.test(
    err?.message || ''
  );
}

function isTransientOverload(err) {
  const http = err?.httpStatus ?? err?.status;
  if (http === 503) return true;
  return /high demand|temporarily|unavailable|try again later/i.test(
    err?.message || ''
  );
}

/** Errors where we should cool the model down and try the next one. */
function isShiftWorthy(err) {
  return isRateLimited(err) || isModelUnavailable(err) || isTransientOverload(err);
}

function cooldownForError(err, fallbackMs) {
  if (isModelUnavailable(err)) return UNAVAILABLE_COOLDOWN_MS;
  if (isRateLimited(err)) {
    return (
      (Number.isFinite(err.retryAfterMs) && err.retryAfterMs > 0
        ? err.retryAfterMs
        : null) ||
      fallbackMs ||
      DEFAULT_COOLDOWN_MS
    );
  }
  if (isTransientOverload(err)) return OVERLOAD_COOLDOWN_MS;
  return fallbackMs || DEFAULT_COOLDOWN_MS;
}

function cooldownRemainingMs(model) {
  const until = modelCooldowns.get(model) || 0;
  return Math.max(0, until - Date.now());
}

function markCooldown(model, retryAfterMs) {
  const ms =
    Number.isFinite(retryAfterMs) && retryAfterMs > 0
      ? retryAfterMs
      : DEFAULT_COOLDOWN_MS;
  modelCooldowns.set(model, Date.now() + ms);
}

/** Test helper — clear cooldowns between cases. */
function clearModelCooldowns() {
  modelCooldowns.clear();
}

/**
 * @param {{
 *   apiKey: string,
 *   baseUrl?: string,
 *   model?: string,
 *   models?: string[] | string,
 *   timeoutMs?: number,
 *   cooldownMs?: number,
 * }} options
 */
function createGeminiProvider({
  apiKey,
  baseUrl = DEFAULT_BASE_URL,
  model,
  models,
  timeoutMs = 30000,
  cooldownMs = DEFAULT_COOLDOWN_MS,
} = {}) {
  if (!apiKey) {
    throw new Error('gemini provider requires AI_API_KEY');
  }

  const chain = parseModels(models);
  if (model && !chain.includes(model)) {
    chain.unshift(model);
  }
  if (chain.length === 0) {
    throw new Error('gemini provider requires at least one model in AI_MODELS');
  }

  return {
    name: 'gemini',
    /** Primary / preferred model (first in chain that is not cooling down). */
    get model() {
      return (
        chain.find((m) => cooldownRemainingMs(m) === 0) || chain[0]
      );
    },
    models: [...chain],

    async complete(input) {
      const attempts = [];
      let lastError;

      // Prefer models not on cooldown; if all cooling, try soonest-ready first.
      const ordered = [...chain].sort(
        (a, b) => cooldownRemainingMs(a) - cooldownRemainingMs(b)
      );

      for (const candidate of ordered) {
        const waitMs = cooldownRemainingMs(candidate);
        if (waitMs > 0) {
          attempts.push({ model: candidate, skipped: true, waitMs });
          continue;
        }

        const underlying = createOpenAiCompatibleProvider({
          name: 'gemini',
          apiKey,
          baseUrl,
          model: candidate,
          timeoutMs,
        });

        try {
          const result = await underlying.complete(input);
          return {
            ...result,
            modelVersion: result.modelVersion || candidate,
            shiftedFrom: attempts.length > 0 ? attempts : undefined,
          };
        } catch (err) {
          lastError = err;
          if (isShiftWorthy(err)) {
            const retryAfter = cooldownForError(err, cooldownMs);
            markCooldown(candidate, retryAfter);
            attempts.push({
              model: candidate,
              shifted: true,
              reason: isModelUnavailable(err)
                ? 'unavailable'
                : isRateLimited(err)
                  ? 'rate_limited'
                  : 'overload',
              retryAfterMs: retryAfter,
            });
            console.warn(
              `[ai] gemini model "${candidate}" ${attempts[attempts.length - 1].reason} — shifting (cooldown ${retryAfter}ms)`
            );
            continue;
          }
          throw err;
        }
      }

      // All models cooling or failed with shift-worthy errors — wait briefly and retry once.
      const nextReady = [...chain]
        .map((m) => ({ model: m, waitMs: cooldownRemainingMs(m) }))
        .sort((a, b) => a.waitMs - b.waitMs)[0];

      if (nextReady && nextReady.waitMs > 0 && nextReady.waitMs <= 15_000) {
        await new Promise((r) => setTimeout(r, nextReady.waitMs + 50));
        const underlying = createOpenAiCompatibleProvider({
          name: 'gemini',
          apiKey,
          baseUrl,
          model: nextReady.model,
          timeoutMs,
        });
        try {
          const result = await underlying.complete(input);
          return {
            ...result,
            modelVersion: result.modelVersion || nextReady.model,
            shiftedFrom: attempts,
          };
        } catch (err) {
          lastError = err;
          if (isShiftWorthy(err)) {
            markCooldown(nextReady.model, cooldownForError(err, cooldownMs));
          }
        }
      }

      const err = new Error(
        `All Gemini models rate-limited or unavailable: ${chain.join(', ')}`
      );
      err.status = 429;
      err.code = 'AI_RATE_LIMIT';
      err.details = { attempts, cause: lastError?.message };
      throw err;
    },
  };
}

module.exports = {
  DEFAULT_GEMINI_MODELS,
  DEFAULT_BASE_URL,
  createGeminiProvider,
  clearModelCooldowns,
  cooldownRemainingMs,
  markCooldown,
  isRateLimited,
  isModelUnavailable,
  isTransientOverload,
  isShiftWorthy,
  parseModels,
};
