const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const env = require('../config/env');

/**
 * Authentication middleware that verifies JWT token from request header.
 * Attaches decoded user context to req.user.
 */
const authenticateUser = (req, res, next) => {
  let token;

  // Read Bearer token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not authenticated. Please log in.', 401, 'UNAUTHORIZED'));
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded; // Contains userId, businessId, role, permissions
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid authentication token. Please log in again.', 401, 'UNAUTHORIZED'));
  }
};

module.exports = authenticateUser;
