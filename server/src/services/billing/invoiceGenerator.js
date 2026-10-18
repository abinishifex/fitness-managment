const { Invoice, Membership, Plan } = require('../../database/models');
const {
  INVOICE_STATUS,
  MEMBERSHIP_STATUS,
  AUDIT_ACTION,
} = require('../../billing/enums');
const { nextPeriod } = require('./period');
const { writeAudit } = require('./audit');
const { createError } = require('../../middleware/errorHandler');

/**
 * Ensure an OPEN invoice exists for the membership's next unpaid period.
 * Idempotent: unique (membershipId, periodStart, periodEnd) — concurrent
 * calls return the same invoice.
 *
 * @param {string|import('mongoose').Types.ObjectId} membershipId
 * @param {{ actorId?: string|null }} [opts]
 * @returns {Promise<import('mongoose').Document>}
 */
async function generateInvoiceForMembership(membershipId, { actorId = null } = {}) {
  const membership = await Membership.findById(membershipId);
  if (!membership) {
    throw createError(404, 'Membership not found');
  }
  if (membership.status === MEMBERSHIP_STATUS.CANCELLED) {
    throw createError(400, 'Cannot invoice a cancelled membership');
  }

  const plan = await Plan.findById(membership.planId);
  if (!plan || !plan.isActive) {
    throw createError(400, 'Plan is missing or inactive');
  }

  // Prefer the latest paid invoice's periodEnd as the next start; else membership start.
  const lastPaid = await Invoice.findOne({
    membershipId: membership._id,
    status: INVOICE_STATUS.PAID,
  })
    .sort({ periodEnd: -1 })
    .lean();

  const lastOpen = await Invoice.findOne({
    membershipId: membership._id,
    status: { $in: [INVOICE_STATUS.OPEN, INVOICE_STATUS.OVERDUE, INVOICE_STATUS.DRAFT] },
  })
    .sort({ periodStart: -1 });

  if (lastOpen) {
    return lastOpen;
  }

  const { periodStart, periodEnd, dueDate } = nextPeriod({
    startDate: membership.startDate,
    interval: plan.interval,
    afterEnd: lastPaid ? lastPaid.periodEnd : null,
  });

  try {
    const invoice = await Invoice.create({
      userId: membership.userId,
      membershipId: membership._id,
      planId: plan._id,
      periodStart,
      periodEnd,
      amount: plan.price,
      currency: plan.currency,
      status: INVOICE_STATUS.OPEN,
      dueDate,
    });

    await writeAudit({
      actorId,
      action: AUDIT_ACTION.INVOICE_GENERATED,
      entityType: 'Invoice',
      entityId: invoice._id,
      meta: {
        membershipId: membership._id.toString(),
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        amount: plan.price,
      },
    });

    return invoice;
  } catch (err) {
    // Race: another request created the same period invoice.
    if (err && (err.code === 11000 || err.code === '11000')) {
      const existing = await Invoice.findOne({
        membershipId: membership._id,
        periodStart,
        periodEnd,
      });
      if (existing) return existing;
    }
    throw err;
  }
}

/**
 * Mark open invoices past dueDate as overdue. Safe to call from cron later.
 * @returns {Promise<number>} count updated
 */
async function markOverdueInvoices(asOf = new Date()) {
  const result = await Invoice.updateMany(
    {
      status: INVOICE_STATUS.OPEN,
      dueDate: { $lt: asOf },
    },
    { $set: { status: INVOICE_STATUS.OVERDUE } }
  );
  return result.modifiedCount || 0;
}

module.exports = {
  generateInvoiceForMembership,
  markOverdueInvoices,
};
