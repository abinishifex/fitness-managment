const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { createError } = require('./errorHandler');

/**
 * Middleware: require valid JWT token
 * Attaches req.userId and req.role from token payload
 */
function requireAuth(req, res, next) {
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

    // Attach userId and role to request
    req.userId = decoded.userId;
    req.role = decoded.role;

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
