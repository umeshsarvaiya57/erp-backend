const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticateUser = require('../middlewares/authMiddleware');
const requireTenant = require('../middlewares/tenantMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

router.use(authenticateUser);
router.use(requireTenant);

router.get('/', requirePermission('dashboard.view'), dashboardController.getDashboardStats);

module.exports = router;
