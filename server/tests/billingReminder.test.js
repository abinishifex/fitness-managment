/**
 * Telegram link + idempotent reminder job.
 */
require('../src/config/loadDotenv');

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const {
  User,
  Plan,
  Invoice,
  Membership,
  Payment,
  ContactPref,
  ReminderLog,
  AuditLog,
} = require('../src/database/models');
const { REMINDER_TIMING } = require('../src/database/models/ReminderLog');
const { seedPlans } = require('../scripts/seedPlans');
const { runReminderJob } = require('../src/jobs/reminderJob');
const { INVOICE_STATUS } = require('../src/billing/enums');

function jsonHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(baseUrl, method, path, { token, body, headers: extra } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...jsonHeaders(token), ...extra },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

describe('Day 2 telegram link + reminders', () => {
  let server;
  let baseUrl;
  let memberToken;
  let userId;
  let invoiceId;
  const stamp = Date.now();
  const asOf = new Date();
  asOf.setHours(12, 0, 0, 0);

  before(async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.REMINDER_JOB_SECRET = 'test-reminder-secret';
    // Patch the already-loaded env singleton (controllers hold this reference).
    const { env } = require('../src/config/env');
    env.telegramWebhookSecret = 'test-webhook-secret';
    env.reminderJobSecret = 'test-reminder-secret';
    env.telegramBotToken = ''; // stub send

    const uri =
      process.env.MONGODB_URI_TEST ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/gym-trainer-test';

    if (mongoose.connection.readyState === 0) {
      let lastErr;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 20000,
            family: 4,
          });
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
      if (lastErr) throw lastErr;
    }

    await seedPlans();
    const monthly = await Plan.findOne({ slug: 'monthly', isActive: true });
    assert.ok(monthly);

    const app = createApp();
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}/api`;

    const reg = await request(baseUrl, 'POST', '/auth/register', {
      body: {
        email: `tg.member.${stamp}@example.com`,
        password: 'MemberPass123!',
        phone: `+2516${String(stamp).slice(-8)}`,
        planId: monthly._id.toString(),
      },
    });
    assert.equal(reg.status, 201, JSON.stringify(reg.body));
    memberToken = reg.body.data.token;
    userId = reg.body.data.user.id;
    invoiceId = reg.body.data.invoice.id;

    // Set invoice due = asOf (due-day reminder)
    await Invoice.findByIdAndUpdate(invoiceId, {
      dueDate: asOf,
      status: INVOICE_STATUS.OPEN,
    });
  });

  after(async () => {
    try {
      if (userId) {
        await ReminderLog.deleteMany({ invoiceId });
        await ContactPref.deleteMany({ userId });
        await Payment.deleteMany({ userId });
        await Invoice.deleteMany({ userId });
        await Membership.deleteMany({ userId });
        await AuditLog.deleteMany({
          $or: [{ actorId: userId }, { entityId: userId }],
        });
        await User.deleteOne({ _id: userId });
      }
    } finally {
      if (server) await new Promise((r) => server.close(r));
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    }
  });

  it('creates link code and webhook binds chatId', async () => {
    const codeRes = await request(baseUrl, 'POST', '/telegram/link-code', {
      token: memberToken,
    });
    assert.equal(codeRes.status, 201, JSON.stringify(codeRes.body));
    const code = codeRes.body.data.code;
    assert.match(code, /^\d{6}$/);

    const webhook = await request(baseUrl, 'POST', '/telegram/webhook', {
      headers: { 'X-Telegram-Bot-Api-Secret-Token': 'test-webhook-secret' },
      body: {
        message: {
          chat: { id: 999001 },
          text: `/start ${code}`,
        },
      },
    });
    assert.equal(webhook.status, 200, JSON.stringify(webhook.body));
    assert.equal(webhook.body.linked, true);

    const pref = await ContactPref.findOne({ userId });
    assert.equal(pref.telegramChatId, '999001');
    assert.equal(pref.linkCode, null);

    const status = await request(baseUrl, 'GET', '/telegram/status', { token: memberToken });
    assert.equal(status.body.data.linked, true);
  });

  it('reminder job sends once then skips on re-run', async () => {
    const first = await runReminderJob({ asOf });
    assert.ok(first.sent >= 1, JSON.stringify(first));

    const log = await ReminderLog.findOne({
      invoiceId,
      timing: REMINDER_TIMING.DUE,
    });
    assert.ok(log);

    const second = await runReminderJob({ asOf });
    const dueSkips = second.details.filter(
      (d) => d.invoiceId === String(invoiceId) && d.timing === REMINDER_TIMING.DUE
    );
    assert.ok(dueSkips.some((d) => d.status === 'already_sent'));
  });

  it('internal reminders endpoint requires secret', async () => {
    const denied = await request(baseUrl, 'POST', '/internal/reminders/run', { body: {} });
    assert.equal(denied.status, 401);

    const ok = await request(baseUrl, 'POST', '/internal/reminders/run', {
      headers: { 'X-Reminder-Secret': 'test-reminder-secret' },
      body: { asOf: asOf.toISOString() },
    });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
  });
});
