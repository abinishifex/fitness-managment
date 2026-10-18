const { Membership, Plan } = require('../../database/models');
const { MEMBERSHIP_STATUS, AUDIT_ACTION } = require('../../billing/enums');
const { daysForInterval, addDays } = require('./period');
const { generateInvoiceForMembership } = require('./invoiceGenerator');
const { writeAudit } = require('./audit');
const { createError } = require('../../middleware/errorHandler');

/**
 * Create an active membership for a user on a plan and generate the first invoice.
 * Does NOT apply payment — membership endDate starts at "now" with zero paid
 * extension until cash/transfer is applied (endDate = start until paid).
 *
 * Convention: on enroll, endDate = startDate (access not extended until pay).
 * Soft-gate banner (Day 2) will surface upcoming/overdue from the open invoice.
 *
 * @param {{ userId: string, planId: string, actorId?: string|null, startDate?: Date }} opts
 */
async function enrollMembership({
  userId,
  planId,
  actorId = null,
  startDate = new Date(),
}) {
  if (!userId) throw createError(400, 'userId is required');
  if (!planId) throw createError(400, 'planId is required');

  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive) {
    throw createError(400, 'Plan not found or inactive');
  }

  const existingActive = await Membership.findOne({
    userId,
    status: MEMBERSHIP_STATUS.ACTIVE,
  });
  if (existingActive) {
    throw createError(409, 'User already has an active membership');
  }

  const start = new Date(startDate);
  const intervalDays = daysForInterval(plan.interval);
  // Period window for the first invoice; access end stays at start until paid.
  const periodEnd = addDays(start, intervalDays);

  const membership = await Membership.create({
    userId,
    planId: plan._id,
    status: MEMBERSHIP_STATUS.ACTIVE,
    startDate: start,
    endDate: start,
    currentPeriodStart: start,
    currentPeriodEnd: periodEnd,
  });

  await writeAudit({
    actorId,
    action: AUDIT_ACTION.MEMBERSHIP_CREATED,
    entityType: 'Membership',
    entityId: membership._id,
    meta: {
      userId: String(userId),
      planId: plan._id.toString(),
      planSlug: plan.slug,
    },
  });

  const invoice = await generateInvoiceForMembership(membership._id, { actorId });

  return { membership, invoice, plan };
}

module.exports = { enrollMembership };
