const mongoose = require('mongoose');
const { Payment, Invoice } = require('../../database/models');
const {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  INVOICE_STATUS,
  AUDIT_ACTION,
} = require('../../billing/enums');
const { generateInvoiceForMembership } = require('./invoiceGenerator');
const { applyPayment } = require('./applyPayment');
const { writeAudit } = require('./audit');
const { createError } = require('../../middleware/errorHandler');

/**
 * Admin-only cash payment: ensure an open invoice, create an approved cash
 * payment, then run applyPayment() so membership extends.
 *
 * Idempotent when `idempotencyKey` is provided.
 *
 * @param {{
 *   membershipId: string,
 *   actorId: string,
 *   amount?: number,
 *   idempotencyKey?: string|null,
 * }} opts
 */
async function recordCash({
  membershipId,
  actorId,
  amount,
  idempotencyKey = null,
}) {
  if (!membershipId) throw createError(400, 'membershipId is required');
  if (!actorId) throw createError(400, 'actorId is required');

  if (idempotencyKey) {
    const existing = await Payment.findOne({ idempotencyKey });
    if (existing) {
      const invoice = await Invoice.findById(existing.invoiceId);
      return {
        payment: existing,
        invoice,
        membership: null,
        alreadyRecorded: true,
      };
    }
  }

  const invoice = await generateInvoiceForMembership(membershipId, { actorId });

  if (
    invoice.status !== INVOICE_STATUS.OPEN &&
    invoice.status !== INVOICE_STATUS.OVERDUE
  ) {
    throw createError(409, `Invoice is ${invoice.status}; cannot record cash`);
  }

  const cashAmount = amount != null ? Number(amount) : invoice.amount;
  if (!Number.isFinite(cashAmount) || cashAmount < 0) {
    throw createError(400, 'Invalid amount');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  let payment;
  try {
    const created = await Payment.create(
      [
        {
          invoiceId: invoice._id,
          userId: invoice.userId,
          amount: cashAmount,
          currency: invoice.currency,
          method: PAYMENT_METHOD.CASH,
          // Pending until applyPayment marks approved — keeps one code path.
          status: PAYMENT_STATUS.PENDING,
          recordedBy: actorId,
          idempotencyKey: idempotencyKey || null,
        },
      ],
      { session }
    );
    payment = created[0];
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    if (err && (err.code === 11000 || err.code === '11000') && idempotencyKey) {
      const existing = await Payment.findOne({ idempotencyKey });
      if (existing) {
        return {
          payment: existing,
          invoice,
          membership: null,
          alreadyRecorded: true,
        };
      }
    }
    throw err;
  } finally {
    await session.endSession();
  }

  await writeAudit({
    actorId,
    action: AUDIT_ACTION.CASH_RECORDED,
    entityType: 'Payment',
    entityId: payment._id,
    meta: {
      invoiceId: invoice._id.toString(),
      membershipId: String(membershipId),
      amount: cashAmount,
    },
  });

  const result = await applyPayment(payment._id, { actorId });

  return {
    payment: result.payment,
    invoice: result.invoice,
    membership: result.membership,
    alreadyRecorded: false,
    alreadyApplied: result.alreadyApplied,
  };
}

module.exports = { recordCash };
