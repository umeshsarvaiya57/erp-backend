const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const authenticateUser = require('../middlewares/authMiddleware');
const requireTenant = require('../middlewares/tenantMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

router.use(authenticateUser);
router.use(requireTenant);

router.get('/leads', requirePermission('crm.view'), crmController.getAllLeads);
router.post('/leads', requirePermission('crm.create'), crmController.createLead);
router.put('/leads/:id', requirePermission('crm.update'), crmController.updateLead);

router.get('/leads/:id/followups', requirePermission('crm.view'), crmController.getFollowUpsForLead);
router.post('/followups', requirePermission('crm.create'), crmController.createFollowUp);

router.get('/timeline', requirePermission('crm.view'), crmController.getActivitiesTimeline);

module.exports = router;
