const mongoose = require('mongoose');
const { PLAN_INTERVAL_VALUES, PLAN_INTERVAL } = require('../../billing/enums');

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
    },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    /** Price in major currency units (e.g. ETB). */
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'ETB', uppercase: true, maxlength: 3 },
    interval: {
      type: String,
      enum: PLAN_INTERVAL_VALUES,
      required: true,
      default: PLAN_INTERVAL.MONTHLY,
    },
    isActive: { type: Boolean, required: true, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

planSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Plan', planSchema);
