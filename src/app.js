const express = require('express');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

/**
 * Build the Express app (no listen / no DB connect).
 * Safe to import from tests and CI without opening sockets.
 */
function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  app.get('/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'fitness-mgt',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // API routers land here in Day 1–2 (auth, profile, exercises, workouts…)
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
