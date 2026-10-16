/**
 * Stub for Dev 2 Telegram delivery.
 * Day 1: log and resolve. Day 2: real Bot API + webhook.
 *
 * @param {{ chatId: string|number, text: string, meta?: object }} opts
 * @returns {Promise<{ ok: boolean, stub: boolean, messageId: null }>}
 */
async function sendTelegram({ chatId, text, meta = {} }) {
  if (!chatId) {
    console.warn('[telegram:stub] skipped — missing chatId', meta);
    return { ok: false, stub: true, messageId: null, reason: 'missing_chat_id' };
  }

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

module.exports = { sendTelegram };
