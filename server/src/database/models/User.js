const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  /** E.164-ish phone for billing contact / Telegram linking later. */
  phone: {
    type: String,
    trim: true,
    default: null,
    maxlength: 32,
  },
  role: {
    type: String,
    enum: ['member', 'trainer', 'admin'],
    required: true,
    default: 'member'
  },
  isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });

userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
);

module.exports = mongoose.model('User', userSchema);
