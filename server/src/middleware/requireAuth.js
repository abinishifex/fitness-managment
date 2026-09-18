const jwt = require('jsonwebtoken');
const { User } = require('../database/models');
const { env } = require('../config/env');
const { createError } = require('./errorHandler');

/**
 * Middleware: require valid JWT token
 * Attaches req.userId and req.role from the live user record (not stale token claims)
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      throw createError(401, 'No token provided');
    }

    // Extract token (format: "Bearer <token>")
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw createError(401, 'No token provided');
    }

    const token = parts[1];

    // Verify token
    const decoded = jwt.verify(token, env.jwtSecret);

    const user = await User.findById(decoded.userId).select('_id role isActive');
    if (!user) {
      throw createError(401, 'Invalid or expired token');
    }
    if (!user.isActive) {
      throw createError(403, 'Account is deactivated');
    }

    // Attach userId and role from DB so role changes take effect immediately
    req.userId = user._id.toString();
    req.role = user.role;

    next();
  } catch (err) {
    // Distinguish between different JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(createError(401, 'Invalid or expired token'));
    }
    next(err);
  }
}

module.exports = requireAuth;
