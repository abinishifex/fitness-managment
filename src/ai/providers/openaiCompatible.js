/**
 * OpenAI-compatible chat completions provider.
 * Works with Groq, Together, OpenRouter, Fireworks, etc. — swap via AI_BASE_URL / AI_MODEL.
 */
function createOpenAiCompatibleProvider({
  name,
  apiKey,
  baseUrl,
  model,
  timeoutMs = 30000,
}) {
  if (!apiKey) {
    throw new Error(`${name} provider requires AI_API_KEY`);
  }
  if (!baseUrl) {
    throw new Error(`${name} provider requires AI_BASE_URL`);
  }

  const completionsUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  return {
    name,
    model,

    /**
     * @param {{
     *   messages: Array<{ role: string, content: string }>,
     *   temperature?: number,
     *   maxTokens?: number,
     *   timeoutMs?: number,
     *   jsonMode?: boolean,
     * }} input
     */
    async complete({
      messages,
      temperature = 0.2,
      maxTokens = 2048,
      timeoutMs: callTimeout = timeoutMs,
      jsonMode = true,
    }) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), callTimeout);

      const body = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      // Groq / most OpenAI-compatible hosts honor this for JSON-only replies.
      if (jsonMode) {
        body.response_format = { type: 'json_object' };
      }

      try {
        const res = await fetch(completionsUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          const detail =
            payload?.error?.message ||
            payload?.message ||
            JSON.stringify(payload) ||
            res.statusText;
          const err = new Error(`${name} API error (${res.status}): ${detail}`);
          err.status = res.status >= 500 ? 502 : 400;
          err.code = 'AI_PROVIDER_ERROR';
          err.details = payload;
          throw err;
        }

        const text = payload?.choices?.[0]?.message?.content;
        if (typeof text !== 'string' || !text.trim()) {
          const err = new Error(`${name} returned empty completion`);
          err.status = 502;
          err.code = 'AI_EMPTY_RESPONSE';
          throw err;
        }

        return {
          text,
          modelVersion: payload.model || model,
          usage: payload.usage
            ? {
                promptTokens: payload.usage.prompt_tokens,
                completionTokens: payload.usage.completion_tokens,
                totalTokens: payload.usage.total_tokens,
              }
            : undefined,
          raw: payload,
        };
      } catch (err) {
        if (err.name === 'AbortError') {
          const timeoutErr = new Error(
            `${name} request timed out after ${callTimeout}ms`
          );
          timeoutErr.status = 504;
          timeoutErr.code = 'AI_TIMEOUT';
          throw timeoutErr;
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

module.exports = { createOpenAiCompatibleProvider };
