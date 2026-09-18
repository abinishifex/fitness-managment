const { createError } = require('./errorHandler');

/**
 * Higher-order middleware: require specific role(s)
 * Must run AFTER requireAuth (which sets req.role)
 * 
 * Usage: requireRole('admin') or requireRole('admin', 'trainer')
 */
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    try {
      if (!req.role) {
        throw createError(401, 'Authentication required');
      }

      if (!allowedRoles.includes(req.role)) {
        throw createError(
          403,
          `Access denied. Requires role: ${allowedRoles.join(' or ')}`
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = requireRole;
