const jwt = require('jsonwebtoken');
const { User } = require('../database/models');
const { env } = require('../config/env');

/**
 * If a Bearer token is present and valid, attach req.userId / req.role.
 * Never fails the request for missing/invalid tokens.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return next();

    const decoded = jwt.verify(parts[1], env.jwtSecret);
    const user = await User.findById(decoded.userId).select('_id role isActive');
    if (user && user.isActive) {
      req.userId = user._id.toString();
      req.role = user.role;
    }
  } catch {
    // ignore — treat as anonymous
  }
  next();
}

module.exports = optionalAuth;
