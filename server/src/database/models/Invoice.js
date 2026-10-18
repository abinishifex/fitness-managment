const mongoose = require('mongoose');
const {
  INVOICE_STATUS_VALUES,
  INVOICE_STATUS,
} = require('../../billing/enums');

const invoiceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    membershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Membership',
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
    },
    /** Idempotency key: one invoice per membership period. */
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'ETB', uppercase: true },
    status: {
      type: String,
      enum: INVOICE_STATUS_VALUES,
      required: true,
      default: INVOICE_STATUS.OPEN,
    },
    dueDate: { type: Date, required: true, index: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

invoiceSchema.index(
  { membershipId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true }
);
invoiceSchema.index({ status: 1, dueDate: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
