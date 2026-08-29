const purchaseService = require('../services/purchaseService');
const { logAction } = require('../services/auditService');

const createPurchase = async (req, res, next) => {
  try {
    const purchase = await purchaseService.createPurchase(req.businessId, req.user.userId, req.body);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'CREATE_PURCHASE',
      module: 'PURCHASES',
      entityId: purchase._id,
      newData: purchase.toObject()
    });

    res.status(201).json({
      success: true,
      message: 'Purchase transaction created successfully',
      data: purchase
    });
  } catch (error) {
    next(error);
  }
};

const getPurchaseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const purchase = await purchaseService.getPurchaseById(req.businessId, id);
    res.status(200).json({
      success: true,
      message: 'Purchase details retrieved successfully',
      data: purchase
    });
  } catch (error) {
    next(error);
  }
};

const getAllPurchases = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const result = await purchaseService.getAllPurchases(req.businessId, { page, limit, search });
    res.status(200).json({
      success: true,
      message: 'Purchase records fetched successfully',
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPurchase,
  getPurchaseById,
  getAllPurchases
};
