const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authenticateUser = require('../middlewares/authMiddleware');
const requireTenant = require('../middlewares/tenantMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

router.use(authenticateUser);
router.use(requireTenant);

// Category Routes
router.get('/', requirePermission('products.view'), categoryController.getAllCategories);
router.post('/', requirePermission('products.create'), categoryController.createCategory);
router.put('/:id', requirePermission('products.update'), categoryController.updateCategory);
router.delete('/:id', requirePermission('products.delete'), categoryController.deleteCategory);

// Brand Routes
router.get('/brands', requirePermission('products.view'), categoryController.getAllBrands);
router.post('/brands', requirePermission('products.create'), categoryController.createBrand);
router.put('/brands/:id', requirePermission('products.update'), categoryController.updateBrand);
router.delete('/brands/:id', requirePermission('products.delete'), categoryController.deleteBrand);

module.exports = router;
