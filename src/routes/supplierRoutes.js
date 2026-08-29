const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const authenticateUser = require('../middlewares/authMiddleware');
const requireTenant = require('../middlewares/tenantMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

router.use(authenticateUser);
router.use(requireTenant);

router.get('/', requirePermission('suppliers.view'), supplierController.getAllSuppliers);
router.get('/:id', requirePermission('suppliers.view'), supplierController.getSupplierById);
router.post('/', requirePermission('suppliers.create'), supplierController.createSupplier);
router.put('/:id', requirePermission('suppliers.update'), supplierController.updateSupplier);
router.delete('/:id', requirePermission('suppliers.delete'), supplierController.deleteSupplier);

module.exports = router;
