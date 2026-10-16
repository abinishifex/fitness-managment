const mongoose = require('mongoose');
const { AUDIT_ACTION_VALUES } = require('../../billing/enums');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: AUDIT_ACTION_VALUES,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ['User', 'Plan', 'Membership', 'Invoice', 'Payment'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
