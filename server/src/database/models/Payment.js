const mongoose = require('mongoose');
const {
  PAYMENT_METHOD_VALUES,
  PAYMENT_STATUS_VALUES,
  PAYMENT_STATUS,
} = require('../../billing/enums');

const paymentSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'ETB', uppercase: true },
    method: {
      type: String,
      enum: PAYMENT_METHOD_VALUES,
      required: true,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUS_VALUES,
      required: true,
      default: PAYMENT_STATUS.PENDING,
    },
    /** Cloudinary (or other) URL — Day 2 transfer screenshots. */
    screenshotUrl: { type: String, default: null },
    /** Cloudinary public_id — used to mint fresh signed preview URLs. */
    screenshotPublicId: { type: String, default: null },
    /** Admin who recorded cash / reviewed transfer. */
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    rejectReason: { type: String, default: null, maxlength: 500 },
    /**
     * Optional client/admin key so double-submit cash records don't double-apply.
     * Unique sparse so missing keys are allowed.
     */
    idempotencyKey: {
      type: String,
      default: null,
      maxlength: 120,
    },
    appliedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, method: 1, createdAt: -1 });
paymentSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Payment', paymentSchema);
