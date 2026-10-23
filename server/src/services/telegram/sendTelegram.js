const { env } = require('../../config/env');

/**
 * Send a Telegram message via Bot API when TELEGRAM_BOT_TOKEN is set.
 * Falls back to stub (console log) when token is missing or in test without forceLive.
 *
 * @param {{ chatId: string|number, text: string, meta?: object }} opts
 * @returns {Promise<{ ok: boolean, stub?: boolean, messageId: string|null, reason?: string }>}
 */
async function sendTelegram({ chatId, text, meta = {} }) {
  if (!chatId) {
    console.warn('[telegram] skipped — missing chatId', meta);
    return { ok: false, stub: true, messageId: null, reason: 'missing_chat_id' };
  }

  const token = env.telegramBotToken;
  if (!token) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 TELEGRAM MESSAGE (STUB — NOT SENT)');
    console.log(`chatId: ${chatId}`);
    console.log(`text: ${text}`);
    if (Object.keys(meta).length) {
      console.log('meta:', JSON.stringify(meta));
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return { ok: true, stub: true, messageId: null };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) {
      console.error('[telegram] send failed', body);
      return {
        ok: false,
        stub: false,
        messageId: null,
        reason: body.description || `http_${res.status}`,
      };
    }
    return {
      ok: true,
      stub: false,
      messageId: body.result?.message_id != null ? String(body.result.message_id) : null,
    };
  } catch (err) {
    console.error('[telegram] network error', err.message);
    return { ok: false, stub: false, messageId: null, reason: err.message };
  }
}

module.exports = { sendTelegram };
