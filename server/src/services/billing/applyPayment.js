const mongoose = require('mongoose');
const { Payment, Invoice, Membership, Plan } = require('../../database/models');
const {
  PAYMENT_STATUS,
  INVOICE_STATUS,
  MEMBERSHIP_STATUS,
  AUDIT_ACTION,
} = require('../../billing/enums');
const { daysForInterval, addDays } = require('./period');
const { writeAudit } = require('./audit');
const { createError } = require('../../middleware/errorHandler');

/**
 * Core money path: approve a payment, mark its invoice paid, extend membership.
 * Idempotent: re-applying an already-approved payment returns the same snapshot.
 *
 * @param {string|import('mongoose').Types.ObjectId} paymentId
 * @param {{ actorId?: string|null, session?: import('mongoose').ClientSession|null }} [opts]
 */
async function applyPayment(paymentId, { actorId = null, session: externalSession = null } = {}) {
  const ownSession = !externalSession;
  const session = externalSession || (await mongoose.startSession());

  const run = async () => {
    if (ownSession) session.startTransaction();

    try {
      const payment = await Payment.findById(paymentId).session(session);
      if (!payment) {
        throw createError(404, 'Payment not found');
      }

      // Idempotent success path
      if (payment.status === PAYMENT_STATUS.APPROVED && payment.appliedAt) {
        const invoice = await Invoice.findById(payment.invoiceId).session(session);
        const membership = await Membership.findById(invoice?.membershipId).session(session);
        if (ownSession) await session.commitTransaction();
        return { payment, invoice, membership, alreadyApplied: true };
      }

      if (payment.status === PAYMENT_STATUS.REJECTED) {
        throw createError(400, 'Cannot apply a rejected payment');
      }

      const invoice = await Invoice.findById(payment.invoiceId).session(session);
      if (!invoice) {
        throw createError(404, 'Invoice not found for payment');
      }

      if (invoice.status === INVOICE_STATUS.VOID) {
        throw createError(400, 'Cannot apply payment to a void invoice');
      }

      if (invoice.status === INVOICE_STATUS.PAID && payment.status !== PAYMENT_STATUS.APPROVED) {
        throw createError(409, 'Invoice is already paid');
      }

      const membership = await Membership.findById(invoice.membershipId).session(session);
      if (!membership) {
        throw createError(404, 'Membership not found for invoice');
      }

      const plan = await Plan.findById(membership.planId).session(session);
      if (!plan) {
        throw createError(404, 'Plan not found for membership');
      }

      const now = new Date();
      const intervalDays = daysForInterval(plan.interval);

      // Extend from the later of current endDate or now (don't leave gaps unpaid
      // but do stack paid time if already active).
      const base = membership.endDate > now ? membership.endDate : now;
      const newEnd = addDays(base, intervalDays);

      payment.status = PAYMENT_STATUS.APPROVED;
      payment.appliedAt = now;
      if (actorId) {
        payment.reviewedBy = actorId;
        payment.reviewedAt = now;
      }
      await payment.save({ session });

      invoice.status = INVOICE_STATUS.PAID;
      invoice.paidAt = now;
      await invoice.save({ session });

      membership.endDate = newEnd;
      membership.currentPeriodStart = invoice.periodStart;
      membership.currentPeriodEnd = invoice.periodEnd;
      membership.status = MEMBERSHIP_STATUS.ACTIVE;
      await membership.save({ session });

      if (ownSession) await session.commitTransaction();

      await writeAudit({
        actorId,
        action: AUDIT_ACTION.PAYMENT_APPLIED,
        entityType: 'Payment',
        entityId: payment._id,
        meta: {
          invoiceId: invoice._id.toString(),
          membershipId: membership._id.toString(),
          amount: payment.amount,
          method: payment.method,
          newEndDate: newEnd.toISOString(),
        },
      });

      await writeAudit({
        actorId,
        action: AUDIT_ACTION.MEMBERSHIP_EXTENDED,
        entityType: 'Membership',
        entityId: membership._id,
        meta: {
          paymentId: payment._id.toString(),
          endDate: newEnd.toISOString(),
          intervalDays,
        },
      });

      return { payment, invoice, membership, alreadyApplied: false };
    } catch (err) {
      if (ownSession && session.inTransaction()) {
        await session.abortTransaction();
      }
      throw err;
    }
  };

  try {
    return await run();
  } finally {
    if (ownSession) {
      await session.endSession();
    }
  }
}

module.exports = { applyPayment };
