const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const authenticateUser = require('../middlewares/authMiddleware');
const requireTenant = require('../middlewares/tenantMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

router.use(authenticateUser);
router.use(requireTenant);

router.get('/', requirePermission('purchases.view'), purchaseController.getAllPurchases);
router.get('/:id', requirePermission('purchases.view'), purchaseController.getPurchaseById);
router.post('/', requirePermission('purchases.create'), purchaseController.createPurchase);

module.exports = router;
