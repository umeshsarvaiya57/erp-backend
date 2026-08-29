const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const authenticateUser = require('../middlewares/authMiddleware');
const requireTenant = require('../middlewares/tenantMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

router.use(authenticateUser);
router.use(requireTenant);

router.get('/', requirePermission('sales.view'), salesController.getAllSales);
router.get('/:id', requirePermission('sales.view'), salesController.getSaleById);
router.post('/', requirePermission('sales.create'), salesController.createSale);
router.post('/:id/return', requirePermission('sales.return'), salesController.cancelSale);

module.exports = router;
