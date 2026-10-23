const { Payment } = require('../../database/models');
const { PAYMENT_STATUS, AUDIT_ACTION } = require('../../billing/enums');
const { writeAudit } = require('./audit');
const { createError } = require('../../middleware/errorHandler');

/**
 * Admin rejects a pending payment (typically a transfer screenshot).
 *
 * @param {string} paymentId
 * @param {{ actorId: string, reason?: string }} opts
 */
async function rejectPayment(paymentId, { actorId, reason = null }) {
  if (!actorId) throw createError(400, 'actorId is required');

  const payment = await Payment.findById(paymentId);
  if (!payment) throw createError(404, 'Payment not found');

  if (payment.status === PAYMENT_STATUS.APPROVED) {
    throw createError(400, 'Cannot reject an already-approved payment');
  }

  if (payment.status === PAYMENT_STATUS.REJECTED) {
    return { payment, alreadyRejected: true };
  }

  if (payment.status !== PAYMENT_STATUS.PENDING) {
    throw createError(400, `Cannot reject payment in status ${payment.status}`);
  }

  const now = new Date();
  payment.status = PAYMENT_STATUS.REJECTED;
  payment.reviewedBy = actorId;
  payment.reviewedAt = now;
  payment.rejectReason = reason ? String(reason).slice(0, 500) : null;
  await payment.save();

  await writeAudit({
    actorId,
    action: AUDIT_ACTION.PAYMENT_REJECTED,
    entityType: 'Payment',
    entityId: payment._id,
    meta: {
      method: payment.method,
      invoiceId: payment.invoiceId.toString(),
      reason: payment.rejectReason,
    },
  });

  return { payment, alreadyRejected: false };
}

module.exports = { rejectPayment };
