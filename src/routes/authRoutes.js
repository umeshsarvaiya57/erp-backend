const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateUser = require('../middlewares/authMiddleware');

// Public Auth Routes
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected Auth Routes
router.post('/logout', authenticateUser, authController.logout);
router.get('/me', authenticateUser, authController.getMe);

module.exports = router;
