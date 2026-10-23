const crypto = require('crypto');
const { ContactPref } = require('../../database/models');
const { createError } = require('../../middleware/errorHandler');

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function generateLinkCode() {
  // 6-digit numeric, easy to type into Telegram
  return String(crypto.randomInt(100000, 999999));
}

/**
 * Create or refresh a one-time link code for the member.
 * @param {string} userId
 */
async function createLinkCode(userId) {
  let pref = await ContactPref.findOne({ userId });
  if (!pref) {
    pref = new ContactPref({ userId });
  }

  let code = generateLinkCode();
  // Rare collision retry
  for (let i = 0; i < 5; i += 1) {
    const clash = await ContactPref.findOne({ linkCode: code, userId: { $ne: userId } });
    if (!clash) break;
    code = generateLinkCode();
  }

  pref.linkCode = code;
  pref.linkCodeExpiresAt = new Date(Date.now() + CODE_TTL_MS);
  await pref.save();

  return {
    code,
    expiresAt: pref.linkCodeExpiresAt,
    linked: Boolean(pref.telegramChatId),
    telegramChatId: pref.telegramChatId,
  };
}

/**
 * Consume a link code from a Telegram /start or message and bind chatId.
 * @param {{ code: string, chatId: string|number }} opts
 */
async function consumeLinkCode({ code, chatId }) {
  const normalized = String(code || '').trim();
  if (!/^\d{6}$/.test(normalized)) {
    throw createError(400, 'Invalid link code');
  }
  if (!chatId) throw createError(400, 'chatId is required');

  const pref = await ContactPref.findOne({ linkCode: normalized });
  if (!pref) throw createError(404, 'Link code not found or already used');
  if (!pref.linkCodeExpiresAt || pref.linkCodeExpiresAt < new Date()) {
    throw createError(410, 'Link code expired — request a new one');
  }

  pref.telegramChatId = String(chatId);
  pref.linkedAt = new Date();
  pref.linkCode = null;
  pref.linkCodeExpiresAt = null;
  await pref.save();

  return { userId: pref.userId.toString(), telegramChatId: pref.telegramChatId };
}

/**
 * Get link status for a user.
 */
async function getLinkStatus(userId) {
  const pref = await ContactPref.findOne({ userId }).lean();
  if (!pref) {
    return { linked: false, telegramChatId: null, hasPendingCode: false };
  }
  const pending =
    Boolean(pref.linkCode) &&
    pref.linkCodeExpiresAt &&
    pref.linkCodeExpiresAt > new Date();
  return {
    linked: Boolean(pref.telegramChatId),
    telegramChatId: pref.telegramChatId,
    hasPendingCode: pending,
    codeExpiresAt: pending ? pref.linkCodeExpiresAt : null,
  };
}

module.exports = {
  createLinkCode,
  consumeLinkCode,
  getLinkStatus,
  generateLinkCode,
  CODE_TTL_MS,
};
