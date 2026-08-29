const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const authenticateUser = require('../middlewares/authMiddleware');
const requireTenant = require('../middlewares/tenantMiddleware');
const { upload } = require('../config/cloudinary');

// All business routes require active user authentication and resolved tenant context
router.use(authenticateUser);
router.use(requireTenant);

router.get('/', businessController.getBusiness);
router.put('/', upload.single('logo'), businessController.updateBusiness);
router.post('/logo', upload.single('logo'), businessController.uploadLogo);

module.exports = router;
