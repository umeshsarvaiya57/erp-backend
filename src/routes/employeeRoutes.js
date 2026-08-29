const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authenticateUser = require('../middlewares/authMiddleware');
const requireTenant = require('../middlewares/tenantMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

router.use(authenticateUser);
router.use(requireTenant);

router.get('/', requirePermission('employees.view'), employeeController.getAllEmployees);
router.post('/', requirePermission('employees.create'), employeeController.createEmployee);
router.put('/:id', requirePermission('employees.update'), employeeController.updateEmployee);

module.exports = router;
