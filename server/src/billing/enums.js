/**
 * Billing status enums — shared by models, Zod schemas, and services.
 * Keep in sync with Mongoose enum arrays on each model.
 */

const PLAN_INTERVAL = Object.freeze({
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
});

const MEMBERSHIP_STATUS = Object.freeze({
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

const INVOICE_STATUS = Object.freeze({
  DRAFT: 'draft',
  OPEN: 'open',
  PAID: 'paid',
  OVERDUE: 'overdue',
  VOID: 'void',
});

const PAYMENT_METHOD = Object.freeze({
  CASH: 'cash',
  TRANSFER: 'transfer',
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

const AUDIT_ACTION = Object.freeze({
  INVOICE_GENERATED: 'invoice_generated',
  PAYMENT_APPLIED: 'payment_applied',
  CASH_RECORDED: 'cash_recorded',
  MEMBERSHIP_EXTENDED: 'membership_extended',
  MEMBERSHIP_CREATED: 'membership_created',
  PAYMENT_APPROVED: 'payment_approved',
  PAYMENT_REJECTED: 'payment_rejected',
  CUSTOMER_CREATED: 'customer_created',
});

const PLAN_INTERVAL_VALUES = Object.values(PLAN_INTERVAL);
const MEMBERSHIP_STATUS_VALUES = Object.values(MEMBERSHIP_STATUS);
const INVOICE_STATUS_VALUES = Object.values(INVOICE_STATUS);
const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHOD);
const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUS);
const AUDIT_ACTION_VALUES = Object.values(AUDIT_ACTION);

/** Days added to membership per plan interval when a payment is applied. */
const INTERVAL_DAYS = Object.freeze({
  [PLAN_INTERVAL.MONTHLY]: 30,
  [PLAN_INTERVAL.QUARTERLY]: 90,
  [PLAN_INTERVAL.YEARLY]: 365,
});

module.exports = {
  PLAN_INTERVAL,
  MEMBERSHIP_STATUS,
  INVOICE_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  AUDIT_ACTION,
  PLAN_INTERVAL_VALUES,
  MEMBERSHIP_STATUS_VALUES,
  INVOICE_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  PAYMENT_STATUS_VALUES,
  AUDIT_ACTION_VALUES,
  INTERVAL_DAYS,
};
