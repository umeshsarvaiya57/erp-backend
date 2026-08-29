const crmService = require('../services/crmService');
const { logAction } = require('../services/auditService');

const createLead = async (req, res, next) => {
  try {
    const lead = await crmService.createLead(req.businessId, req.user.userId, req.body);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'CREATE_LEAD',
      module: 'CRM',
      entityId: lead._id,
      newData: lead.toObject()
    });

    res.status(201).json({
      success: true,
      message: 'CRM Lead created successfully',
      data: lead
    });
  } catch (error) {
    next(error);
  }
};

const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldLead = await crmService.updateLead(req.businessId, id, req.user.userId, req.body);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'UPDATE_LEAD',
      module: 'CRM',
      entityId: id,
      newData: oldLead.toObject()
    });

    res.status(200).json({
      success: true,
      message: 'CRM Lead updated successfully',
      data: oldLead
    });
  } catch (error) {
    next(error);
  }
};

const getAllLeads = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status || null;

    const result = await crmService.getAllLeads(req.businessId, { page, limit, search, status });
    res.status(200).json({
      success: true,
      message: 'Leads fetched successfully',
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

const createFollowUp = async (req, res, next) => {
  try {
    const followup = await crmService.createFollowUp(req.businessId, req.user.userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Followup scheduled successfully',
      data: followup
    });
  } catch (error) {
    next(error);
  }
};

const getFollowUpsForLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await crmService.getFollowUpsForLead(req.businessId, id);
    res.status(200).json({
      success: true,
      message: 'Followups retrieved successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

const getActivitiesTimeline = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await crmService.getActivitiesTimeline(req.businessId, { page, limit });
    res.status(200).json({
      success: true,
      message: 'Timeline activities fetched successfully',
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLead,
  updateLead,
  getAllLeads,
  createFollowUp,
  getFollowUpsForLead,
  getActivitiesTimeline
};
