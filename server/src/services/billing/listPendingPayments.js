const { Payment } = require('../../database/models');
const { PAYMENT_STATUS } = require('../../billing/enums');

/**
 * Payments awaiting admin review (transfer screenshots — Day 2).
 * Cash goes straight through applyPayment and should not appear here.
 *
 * @param {{ limit?: number, skip?: number }} [opts]
 */
async function listPendingPayments({ limit = 50, skip = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safeSkip = Math.max(Number(skip) || 0, 0);

  const [items, total] = await Promise.all([
    Payment.find({ status: PAYMENT_STATUS.PENDING })
      .sort({ createdAt: 1 })
      .skip(safeSkip)
      .limit(safeLimit)
      .populate('userId', 'email phone role')
      .populate('invoiceId')
      .lean(),
    Payment.countDocuments({ status: PAYMENT_STATUS.PENDING }),
  ]);

  return { items, total, limit: safeLimit, skip: safeSkip };
}

module.exports = { listPendingPayments };
