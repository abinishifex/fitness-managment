const {
  createLinkCode,
  consumeLinkCode,
  getLinkStatus,
} = require('../services/telegram/linkTelegram');
const { sendTelegram } = require('../services/telegram/sendTelegram');
const { env } = require('../config/env');
const { createError } = require('../middleware/errorHandler');

/**
 * POST /api/telegram/link-code — member requests a one-time link code.
 */
async function postLinkCode(req, res, next) {
  try {
    const result = await createLinkCode(req.userId);
    const bot = env.telegramBotUsername;
    const deepLink = bot ? `https://t.me/${bot}?start=${result.code}` : null;
    const instructions = bot
      ? `Open @${bot} and send: /start ${result.code}`
      : `Open your gym Telegram bot and send: /start ${result.code}`;
    res.status(201).json({
      success: true,
      data: {
        code: result.code,
        expiresAt: result.expiresAt,
        linked: result.linked,
        botUsername: bot || null,
        deepLink,
        instructions,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/telegram/status — member link status.
 */
async function getStatus(req, res, next) {
  try {
    const status = await getLinkStatus(req.userId);
    const bot = env.telegramBotUsername || null;
    res.json({
      success: true,
      data: {
        ...status,
        botUsername: bot,
        deepLinkBase: bot ? `https://t.me/${bot}` : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify Telegram webhook secret (header X-Telegram-Bot-Api-Secret-Token
 * or query ?secret=).
 */
function assertWebhookSecret(req) {
  const expected = env.telegramWebhookSecret;
  if (!expected) {
    if (env.nodeEnv === 'production') {
      throw createError(503, 'Telegram webhook is not configured');
    }
    return;
  }
  const header = req.get('X-Telegram-Bot-Api-Secret-Token');
  const query = req.query.secret;
  if (header !== expected && query !== expected) {
    throw createError(401, 'Invalid webhook secret');
  }
}

/**
 * Extract a 6-digit code from /start CODE or bare CODE message text.
 */
function extractCode(text) {
  if (!text) return null;
  const startMatch = String(text).trim().match(/^\/start(?:@\w+)?\s+(\d{6})\s*$/i);
  if (startMatch) return startMatch[1];
  const bare = String(text).trim().match(/^(\d{6})$/);
  return bare ? bare[1] : null;
}

/**
 * POST /api/telegram/webhook — Telegram Bot API updates.
 */
async function postWebhook(req, res, next) {
  try {
    assertWebhookSecret(req);

    const message = req.body?.message || req.body?.edited_message;
    const chatId = message?.chat?.id;
    const text = message?.text;

    // Always 200 quickly so Telegram doesn't retry endlessly on our logic errors
    if (!chatId || !text) {
      return res.json({ ok: true, ignored: true });
    }

    const code = extractCode(text);
    if (!code) {
      await sendTelegram({
        chatId,
        text: 'Send /start YOURCODE to link your gym account. Get a code from the app → Link Telegram.',
      });
      return res.json({ ok: true, helped: true });
    }

    try {
      const linked = await consumeLinkCode({ code, chatId });
      await sendTelegram({
        chatId,
        text: 'Linked! You will receive payment reminders here.',
        meta: { userId: linked.userId },
      });
      return res.json({ ok: true, linked: true, userId: linked.userId });
    } catch (err) {
      const msg = err.status === 410 || err.status === 404 || err.status === 400
        ? err.message
        : 'Could not link that code. Request a new one in the app.';
      await sendTelegram({ chatId, text: msg });
      return res.json({ ok: true, linked: false, error: err.message });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  postLinkCode,
  getStatus,
  postWebhook,
};
