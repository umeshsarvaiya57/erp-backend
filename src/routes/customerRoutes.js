const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authenticateUser = require('../middlewares/authMiddleware');
const requireTenant = require('../middlewares/tenantMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

router.use(authenticateUser);
router.use(requireTenant);

router.get('/', requirePermission('customers.view'), customerController.getAllCustomers);
router.get('/:id', requirePermission('customers.view'), customerController.getCustomerById);
router.post('/', requirePermission('customers.create'), customerController.createCustomer);
router.put('/:id', requirePermission('customers.update'), customerController.updateCustomer);
router.delete('/:id', requirePermission('customers.delete'), customerController.deleteCustomer);

module.exports = router;
