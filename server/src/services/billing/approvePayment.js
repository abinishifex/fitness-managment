const { Payment } = require('../../database/models');
const { PAYMENT_STATUS, AUDIT_ACTION, PAYMENT_METHOD } = require('../../billing/enums');
const { applyPayment } = require('./applyPayment');
const { writeAudit } = require('./audit');
const { createError } = require('../../middleware/errorHandler');

/**
 * Admin approves a pending transfer payment and applies it (extends membership).
 * Idempotent if already approved via applyPayment.
 *
 * @param {string} paymentId
 * @param {{ actorId: string }} opts
 */
async function approvePayment(paymentId, { actorId }) {
  if (!actorId) throw createError(400, 'actorId is required');

  const payment = await Payment.findById(paymentId);
  if (!payment) throw createError(404, 'Payment not found');

  if (payment.status === PAYMENT_STATUS.REJECTED) {
    throw createError(400, 'Cannot approve a rejected payment');
  }

  if (payment.status === PAYMENT_STATUS.APPROVED && payment.appliedAt) {
    const result = await applyPayment(paymentId, { actorId });
    return { ...result, alreadyApproved: true };
  }

  if (payment.status !== PAYMENT_STATUS.PENDING) {
    throw createError(400, `Cannot approve payment in status ${payment.status}`);
  }

  if (payment.method === PAYMENT_METHOD.TRANSFER && !payment.screenshotUrl) {
    throw createError(400, 'Transfer payment has no screenshot to review');
  }

  payment.reviewedBy = actorId;
  payment.reviewedAt = new Date();
  await payment.save();

  await writeAudit({
    actorId,
    action: AUDIT_ACTION.PAYMENT_APPROVED,
    entityType: 'Payment',
    entityId: payment._id,
    meta: { method: payment.method, invoiceId: payment.invoiceId.toString() },
  });

  const result = await applyPayment(paymentId, { actorId });
  return { ...result, alreadyApproved: false };
}

module.exports = { approvePayment };
