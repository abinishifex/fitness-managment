const mongoose = require('mongoose');

/** Timing keys for the three reminder windows. */
const REMINDER_TIMING = Object.freeze({
  BEFORE_3D: 'before_3d',
  DUE: 'due',
  OVERDUE_3D: 'overdue_3d',
});

const REMINDER_TIMING_VALUES = Object.values(REMINDER_TIMING);

const reminderLogSchema = new mongoose.Schema(
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
    },
    timing: {
      type: String,
      enum: REMINDER_TIMING_VALUES,
      required: true,
    },
    sentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    telegramMessageId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

reminderLogSchema.index({ invoiceId: 1, timing: 1 }, { unique: true });

module.exports = mongoose.model('ReminderLog', reminderLogSchema);
module.exports.REMINDER_TIMING = REMINDER_TIMING;
module.exports.REMINDER_TIMING_VALUES = REMINDER_TIMING_VALUES;
