const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authenticateUser = require('../middlewares/authMiddleware');
const requireTenant = require('../middlewares/tenantMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

router.use(authenticateUser);
router.use(requireTenant);

router.get('/financial', requirePermission('reports.view'), reportController.getFinancialReport);

module.exports = router;
