/**
 * Central error-handling middleware.
 * Controllers should `next(err)` or throw; this formats a consistent JSON body.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  const body = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || undefined,
    },
  };

  if (!isProd && err.stack) {
    body.error.stack = err.stack;
  }

  if (err.details) {
    body.error.details = err.details;
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(status).json(body);
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

/** Helper to create HTTP errors with a status code. */
function createError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  if (details) err.details = details;
  return err;
}

module.exports = { errorHandler, notFoundHandler, createError };
