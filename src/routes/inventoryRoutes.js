const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const authenticateUser = require('../middlewares/authMiddleware');
const requireTenant = require('../middlewares/tenantMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

router.use(authenticateUser);
router.use(requireTenant);

router.get('/history', requirePermission('inventory.view'), inventoryController.getInventoryHistory);
router.post('/adjust', requirePermission('inventory.adjust'), inventoryController.adjustStock);

module.exports = router;
