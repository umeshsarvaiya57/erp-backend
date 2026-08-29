const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticateUser = require('../middlewares/authMiddleware');
const requireTenant = require('../middlewares/tenantMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

// Force active tenant session authentication on all product endpoints
router.use(authenticateUser);
router.use(requireTenant);

router.get('/', requirePermission('products.view'), productController.getAllProducts);
router.get('/:id', requirePermission('products.view'), productController.getProductById);
router.post('/', requirePermission('products.create'), productController.createProduct);
router.put('/:id', requirePermission('products.update'), productController.updateProduct);
router.delete('/:id', requirePermission('products.delete'), productController.deleteProduct);

module.exports = router;
