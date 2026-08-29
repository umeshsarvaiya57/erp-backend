const AppError = require('../utils/AppError');

/**
 * Middleware that verifies if the user has the required action permission.
 * Grants access to SUPER_ADMIN and Business OWNER automatically.
 */
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('User session not found', 401, 'UNAUTHORIZED'));
    }

    // Super Admin and Owner have complete dashboard access
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'OWNER') {
      return next();
    }

    // Verify employee/manager contains permission string
    if (Array.isArray(req.user.permissions) && req.user.permissions.includes(requiredPermission)) {
      return next();
    }

    return next(new AppError('Access denied. You do not have permission for this operation.', 403, 'FORBIDDEN'));
  };
};

module.exports = requirePermission;
