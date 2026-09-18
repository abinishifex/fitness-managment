const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');

/**
 * Build the Express app (no listen / no DB connect).
 * Safe to import from tests and CI without opening sockets.
 */
function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'fitness-mgt',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Mount routes
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);

  // Placeholder for other API routes
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
