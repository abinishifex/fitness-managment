const { Payment, Invoice } = require('../../database/models');
const {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  INVOICE_STATUS,
  AUDIT_ACTION,
} = require('../../billing/enums');
const { writeAudit } = require('./audit');
const { createError } = require('../../middleware/errorHandler');

/**
 * Member submits a bank-transfer payment with a screenshot URL.
 * Creates a pending Payment for admin review — does NOT apply yet.
 *
 * @param {{ invoiceId: string, userId: string, screenshotUrl: string, screenshotPublicId?: string|null, amount?: number, idempotencyKey?: string|null }} opts
 */
async function recordTransfer({
  invoiceId,
  userId,
  screenshotUrl,
  screenshotPublicId = null,
  amount = null,
  idempotencyKey = null,
}) {
  if (!screenshotUrl) throw createError(400, 'screenshotUrl is required');

  if (idempotencyKey) {
    const existing = await Payment.findOne({ idempotencyKey });
    if (existing) {
      return { payment: existing, alreadyRecorded: true };
    }
  }

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw createError(404, 'Invoice not found');

  if (String(invoice.userId) !== String(userId)) {
    throw createError(403, 'Invoice does not belong to this user');
  }

  if (
    invoice.status !== INVOICE_STATUS.OPEN &&
    invoice.status !== INVOICE_STATUS.OVERDUE
  ) {
    throw createError(400, `Cannot pay invoice in status ${invoice.status}`);
  }

  const pendingExisting = await Payment.findOne({
    invoiceId: invoice._id,
    method: PAYMENT_METHOD.TRANSFER,
    status: PAYMENT_STATUS.PENDING,
  });
  if (pendingExisting) {
    throw createError(409, 'A pending transfer payment already exists for this invoice');
  }

  const payAmount = amount != null ? amount : invoice.amount;

  let payment;
  try {
    payment = await Payment.create({
      invoiceId: invoice._id,
      userId: invoice.userId,
      amount: payAmount,
      currency: invoice.currency,
      method: PAYMENT_METHOD.TRANSFER,
      status: PAYMENT_STATUS.PENDING,
      screenshotUrl,
      screenshotPublicId: screenshotPublicId || null,
      idempotencyKey: idempotencyKey || null,
    });
  } catch (err) {
    if (err && (err.code === 11000 || err.code === '11000') && idempotencyKey) {
      const existing = await Payment.findOne({ idempotencyKey });
      if (existing) return { payment: existing, alreadyRecorded: true };
    }
    throw err;
  }

  await writeAudit({
    actorId: userId,
    action: AUDIT_ACTION.TRANSFER_SUBMITTED,
    entityType: 'Payment',
    entityId: payment._id,
    meta: {
      method: PAYMENT_METHOD.TRANSFER,
      invoiceId: invoice._id.toString(),
      screenshotUrl,
    },
  });

  return { payment, alreadyRecorded: false };
}

module.exports = { recordTransfer };
