const mongoose = require('mongoose');
const {
  MEMBERSHIP_STATUS_VALUES,
  MEMBERSHIP_STATUS,
} = require('../../billing/enums');

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
    },
    status: {
      type: String,
      enum: MEMBERSHIP_STATUS_VALUES,
      required: true,
      default: MEMBERSHIP_STATUS.ACTIVE,
    },
    startDate: { type: Date, required: true },
    /** Inclusive end of paid access. Extended by applyPayment(). */
    endDate: { type: Date, required: true },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, status: 1 });
membershipSchema.index({ endDate: 1, status: 1 });

module.exports = mongoose.model('Membership', membershipSchema);
