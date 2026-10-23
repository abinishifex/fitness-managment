const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { env } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const planRoutes = require('./routes/planRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const internalRoutes = require('./routes/internalRoutes');

/**
 * Build the Express app (no listen / no DB connect).
 * Safe to import from tests and CI without opening sockets.
 */
function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const origin = env.frontendOrigin;
  const allowedOrigins = origin
    ? origin.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  if (env.nodeEnv === 'production' && allowedOrigins.length === 0) {
    throw new Error('FRONTEND_ORIGIN must be set in production');
  }
  app.use(
    cors({
      // Reflect any origin only outside production (local/dev/test).
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many auth attempts' } },
  });

  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many uploads' } },
  });

  const healthHandler = (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'fitness-mgt',
        timestamp: new Date().toISOString(),
      },
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/exercises', exerciseRoutes);
  app.use('/api/workouts', workoutRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/memberships', membershipRoutes);
  app.use('/api/payments/transfer', uploadLimiter);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/telegram', telegramRoutes);
  app.use('/api/internal', internalRoutes);

  app.use('/api', (req, res) => {
    res.status(501).json({
      success: false,
      error: { message: 'API routes not mounted yet' },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
