const mongoose = require('mongoose');

const contactPrefSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    telegramChatId: {
      type: String,
      default: null,
      maxlength: 64,
    },
    linkCode: {
      type: String,
      default: null,
      maxlength: 16,
    },
    linkCodeExpiresAt: {
      type: Date,
      default: null,
    },
    linkedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

contactPrefSchema.index(
  { linkCode: 1 },
  {
    unique: true,
    partialFilterExpression: { linkCode: { $type: 'string' } },
  }
);

module.exports = mongoose.model('ContactPref', contactPrefSchema);
