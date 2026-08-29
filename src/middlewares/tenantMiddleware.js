const AppError = require('../utils/AppError');

/**
 * Middleware to enforce tenant isolation.
 * Extracts businessId from verified JWT context and binds to req.businessId.
 * Bypasses only for global administrative tasks performed by SUPER_ADMIN.
 */
const requireTenant = (req, res, next) => {
  // If Super Admin, they can view global collections or act on a specific tenant specified in headers
  if (req.user.role === 'SUPER_ADMIN') {
    req.businessId = req.headers['x-tenant-id'] || req.query.businessId || null;
    return next();
  }

  if (!req.user.businessId) {
    return next(new AppError('Access denied. No active business associated with your session.', 403, 'TENANT_REQUIRED'));
  }

  req.businessId = req.user.businessId;
  next();
};

module.exports = requireTenant;
