const inventoryService = require('../services/inventoryService');
const { logAction } = require('../services/auditService');

const adjustStock = async (req, res, next) => {
  try {
    const result = await inventoryService.adjustStock(req.businessId, req.user.userId, req.body);

    // Record adjustment audit log
    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'STOCK_ADJUSTMENT',
      module: 'INVENTORY',
      entityId: result.transaction._id,
      newData: result.transaction.toObject()
    });

    res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: result.product
    });
  } catch (error) {
    next(error);
  }
};

const getInventoryHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const productId = req.query.productId || null;

    const result = await inventoryService.getInventoryHistory(req.businessId, {
      page,
      limit,
      productId
    });

    res.status(200).json({
      success: true,
      message: 'Inventory transaction history fetched successfully',
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adjustStock,
  getInventoryHistory
};
