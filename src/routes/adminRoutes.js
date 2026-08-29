const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticateUser = require('../middlewares/authMiddleware');
const AppError = require('../utils/AppError');

// Middleware to ensure user is SUPER_ADMIN
const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'SUPER_ADMIN') {
    return next();
  }
  return next(new AppError('Forbidden. Access limited to Super Admin only.', 403, 'FORBIDDEN'));
};

// Mount guardrails on all admin routes
router.use(authenticateUser);
router.use(requireSuperAdmin);

router.get('/dashboard', adminController.getDashboardSummary);
router.get('/businesses', adminController.getAllBusinesses);
router.post('/businesses', adminController.createBusiness);
router.put('/businesses/:id/status', adminController.updateBusinessStatus);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
