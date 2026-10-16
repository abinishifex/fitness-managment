const { Invoice } = require('../../database/models');
const { INVOICE_STATUS } = require('../../billing/enums');
const { addDays } = require('./period');

/**
 * Open/overdue invoices whose dueDate falls within the next `days` days
 * (or already overdue). Used by Dev 2 reminder job.
 *
 * @param {number} days Lookahead window (e.g. 3 for "3 days before")
 * @param {{ asOf?: Date, includeOverdue?: boolean, limit?: number }} [opts]
 */
async function listInvoicesDueWithin(
  days,
  { asOf = new Date(), includeOverdue = true, limit = 200 } = {}
) {
  const windowDays = Number(days);
  if (!Number.isFinite(windowDays) || windowDays < 0) {
    throw new Error('days must be a non-negative number');
  }

  const windowEnd = addDays(asOf, windowDays);
  const statuses = includeOverdue
    ? [INVOICE_STATUS.OPEN, INVOICE_STATUS.OVERDUE]
    : [INVOICE_STATUS.OPEN];

  const filter = {
    status: { $in: statuses },
    dueDate: { $lte: windowEnd },
  };

  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);

  const items = await Invoice.find(filter)
    .sort({ dueDate: 1 })
    .limit(safeLimit)
    .populate('userId', 'email phone role')
    .populate('membershipId')
    .populate('planId', 'name slug price currency interval')
    .lean();

  return { items, asOf, windowEnd, days: windowDays };
}

module.exports = { listInvoicesDueWithin };
