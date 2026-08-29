const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field: ${err.path}`;
    errorCode = 'INVALID_FORMAT';
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    errorCode = 'DUPLICATE_KEY';
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(', ');
    errorCode = 'VALIDATION_ERROR';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please log in again.';
    errorCode = 'UNAUTHORIZED';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
    errorCode = 'TOKEN_EXPIRED';
  }

  console.error('[Error Details]:', {
    message: err.message,
    name: err.name,
    code: err.code,
    statusCode,
    errorCode,
    stack: err.stack
  });

  res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
