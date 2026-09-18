const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { User } = require('../database/models');
const { env } = require('../config/env');
const { createError } = require('../middleware/errorHandler');

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const passwordResetSchema = z.object({
  email: z.string().email('Invalid email format'),
});

/**
 * POST /api/auth/register
 * Create a new user account
 */
async function register(req, res, next) {
  try {
    // Validate input
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw createError(400, 'Validation failed', errors);
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw createError(409, 'Email already registered');
    }

    // Hash password (12 salt rounds)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      role: 'member', // default
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    // Response: never include passwordHash
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Authenticate existing user
 */
async function login(req, res, next) {
  try {
    // Validate input
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw createError(400, 'Validation failed', errors);
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Look up user
    const user = await User.findOne({ email: normalizedEmail });

    // Generic 401 whether user not found OR password mismatch (prevents user enumeration)
    if (!user) {
      throw createError(401, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw createError(401, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw createError(403, 'Account is deactivated');
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Stateless JWT — no server-side invalidation needed
 */
async function logout(req, res, next) {
  try {
    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/password-reset-stub
 * Stub implementation: generates reset token and logs it (no email sent)
 */
async function passwordResetStub(req, res, next) {
  try {
    // Validate input
    const parsed = passwordResetSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw createError(400, 'Validation failed', errors);
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Look up user without revealing if it exists
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // Generate random reset token (stub: not saved to DB)
      const resetToken = require('crypto').randomBytes(32).toString('hex');

      // STUB: Log to console instead of emailing
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 PASSWORD RESET TOKEN (STUB - NOT SENT VIA EMAIL)');
      console.log(`User: ${user.email}`);
      console.log(`Token: ${resetToken}`);
      console.log(`Expires: ${new Date(Date.now() + 3600000).toISOString()} (1 hour)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    // Always return success — don't reveal whether email exists
    res.json({
      success: true,
      data: {
        message: 'If that email is registered, a password reset link has been sent.',
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  passwordResetStub,
};
