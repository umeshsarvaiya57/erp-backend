const businessService = require('../services/businessService');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Business = require('../models/Business');
const { logAction } = require('../services/auditService');

const createBusiness = async (req, res, next) => {
  try {
    const result = await businessService.createBusiness(req.body);

    // Record audit trail
    await logAction({
      businessId: null,
      userId: req.user.userId,
      action: 'CREATE_BUSINESS',
      module: 'SUPER_ADMIN',
      entityId: result.business._id,
      newData: { name: result.business.name, email: result.business.email }
    });

    res.status(201).json({
      success: true,
      message: 'Business and owner account created successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getAllBusinesses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const result = await businessService.getAllBusinesses(page, limit, search);
    res.status(200).json({
      success: true,
      message: 'Businesses fetched successfully',
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

const updateBusinessStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const oldBusiness = await Business.findById(id);
    const updatedBusiness = await businessService.updateBusinessStatus(id, isActive);

    // Record status modification
    await logAction({
      businessId: null,
      userId: req.user.userId,
      action: isActive ? 'ACTIVATE_BUSINESS' : 'DEACTIVATE_BUSINESS',
      module: 'SUPER_ADMIN',
      entityId: id,
      oldData: { isActive: oldBusiness.isActive },
      newData: { isActive: updatedBusiness.isActive }
    });

    res.status(200).json({
      success: true,
      message: `Business ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedBusiness
    });
  } catch (error) {
    next(error);
  }
};

const getDashboardSummary = async (req, res, next) => {
  try {
    const totalBusinesses = await Business.countDocuments();
    const activeBusinesses = await Business.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments();
    
    // Retrieve top 10 most recent global logs
    const recentLogs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name email');

    res.status(200).json({
      success: true,
      message: 'Super Admin metrics retrieved successfully',
      data: {
        totalBusinesses,
        activeBusinesses,
        totalUsers,
        recentLogs
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await AuditLog.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('businessId', 'name');

    res.status(200).json({
      success: true,
      message: 'System audit logs retrieved successfully',
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBusiness,
  getAllBusinesses,
  updateBusinessStatus,
  getDashboardSummary,
  getAuditLogs
};
