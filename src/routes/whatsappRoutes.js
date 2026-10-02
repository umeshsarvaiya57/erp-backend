const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const authenticateUser = require('../middlewares/authMiddleware');
const requireTenant = require('../middlewares/tenantMiddleware');

router.use(authenticateUser);
router.use(requireTenant);

router.get('/status', whatsappController.getStatus);
router.post('/initialize', whatsappController.initialize);
router.post('/logout', whatsappController.logout);
router.post('/auto-send', whatsappController.toggleAutoSend);
router.post('/test', whatsappController.sendTestMessage);

module.exports = router;
