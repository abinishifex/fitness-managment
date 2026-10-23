const { Invoice, ContactPref, ReminderLog, User } = require('../database/models');
const { REMINDER_TIMING } = require('../database/models/ReminderLog');
const { INVOICE_STATUS } = require('../billing/enums');
const { markOverdueInvoices } = require('../services/billing/invoiceGenerator');
const { sendTelegram } = require('../services/telegram/sendTelegram');
const { addDays } = require('../services/billing/period');

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a, b) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function classifyTiming(invoice, asOf) {
  const due = startOfDay(invoice.dueDate);
  const today = startOfDay(asOf);
  const delta = daysBetween(today, due); // positive = due in future

  if (delta === 3) return REMINDER_TIMING.BEFORE_3D;
  if (delta === 0) return REMINDER_TIMING.DUE;
  if (delta === -3) return REMINDER_TIMING.OVERDUE_3D;
  return null;
}

function messageFor(timing, invoice, user) {
  const amount = `${invoice.amount} ${invoice.currency}`;
  const due = new Date(invoice.dueDate).toISOString().slice(0, 10);
  const who = user?.email || 'member';

  if (timing === REMINDER_TIMING.BEFORE_3D) {
    return `Hi ${who} — your gym invoice of ${amount} is due in 3 days (${due}). Please pay cash at the desk or upload a transfer screenshot in the app.`;
  }
  if (timing === REMINDER_TIMING.DUE) {
    return `Hi ${who} — your gym invoice of ${amount} is due today (${due}). Please pay to keep your membership active.`;
  }
  return `Hi ${who} — your gym invoice of ${amount} is 3 days overdue (was due ${due}). Please settle payment soon.`;
}

/**
 * Run the daily reminder sweep.
 * Idempotent via ReminderLog unique (invoiceId, timing).
 *
 * @param {{ asOf?: Date, dryRun?: boolean }} [opts]
 */
async function runReminderJob({ asOf = new Date(), dryRun = false } = {}) {
  await markOverdueInvoices(asOf);

  // Open + overdue invoices whose dueDate is within ±3 days of today
  const windowStart = addDays(startOfDay(asOf), -3);
  const windowEnd = addDays(startOfDay(asOf), 3);
  windowEnd.setHours(23, 59, 59, 999);

  const invoices = await Invoice.find({
    status: { $in: [INVOICE_STATUS.OPEN, INVOICE_STATUS.OVERDUE] },
    dueDate: { $gte: windowStart, $lte: windowEnd },
  }).lean();

  const summary = {
    scanned: invoices.length,
    sent: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  for (const invoice of invoices) {
    const timing = classifyTiming(invoice, asOf);
    if (!timing) {
      summary.skipped += 1;
      continue;
    }

    const already = await ReminderLog.findOne({
      invoiceId: invoice._id,
      timing,
    }).lean();
    if (already) {
      summary.skipped += 1;
      summary.details.push({ invoiceId: String(invoice._id), timing, status: 'already_sent' });
      continue;
    }

    const pref = await ContactPref.findOne({ userId: invoice.userId }).lean();
    if (!pref?.telegramChatId) {
      summary.skipped += 1;
      summary.details.push({ invoiceId: String(invoice._id), timing, status: 'no_telegram' });
      continue;
    }

    const user = await User.findById(invoice.userId).select('email').lean();
    const text = messageFor(timing, invoice, user);

    if (dryRun) {
      summary.sent += 1;
      summary.details.push({ invoiceId: String(invoice._id), timing, status: 'dry_run' });
      continue;
    }

    const result = await sendTelegram({
      chatId: pref.telegramChatId,
      text,
      meta: { invoiceId: String(invoice._id), timing },
    });

    if (!result.ok) {
      summary.errors += 1;
      summary.details.push({
        invoiceId: String(invoice._id),
        timing,
        status: 'send_failed',
        reason: result.reason,
      });
      continue;
    }

    try {
      await ReminderLog.create({
        invoiceId: invoice._id,
        userId: invoice.userId,
        timing,
        sentAt: new Date(),
        telegramMessageId: result.messageId,
      });
      summary.sent += 1;
      summary.details.push({
        invoiceId: String(invoice._id),
        timing,
        status: result.stub ? 'stub_sent' : 'sent',
      });
    } catch (err) {
      // Duplicate key = another worker already logged — treat as skip
      if (err && (err.code === 11000 || err.code === '11000')) {
        summary.skipped += 1;
        summary.details.push({ invoiceId: String(invoice._id), timing, status: 'already_sent' });
      } else {
        summary.errors += 1;
        summary.details.push({
          invoiceId: String(invoice._id),
          timing,
          status: 'log_failed',
          reason: err.message,
        });
      }
    }
  }

  return summary;
}

module.exports = { runReminderJob, classifyTiming, REMINDER_TIMING };
