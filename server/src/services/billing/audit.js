const { AuditLog } = require('../../database/models');

/**
 * Write an audit row. Never throws into the money path — logs and swallows.
 * Callers that need hard failure should use createAuditStrict.
 */
async function writeAudit({ actorId = null, action, entityType, entityId, meta = {} }) {
  try {
    return await AuditLog.create({
      actorId: actorId || null,
      action,
      entityType,
      entityId,
      meta,
    });
  } catch (err) {
    console.error('[audit] failed to write', { action, entityType, entityId, err: err.message });
    return null;
  }
}

async function createAuditStrict({ actorId = null, action, entityType, entityId, meta = {} }) {
  return AuditLog.create({
    actorId: actorId || null,
    action,
    entityType,
    entityId,
    meta,
  });
}

module.exports = { writeAudit, createAuditStrict };
