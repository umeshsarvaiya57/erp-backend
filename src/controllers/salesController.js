const salesService = require('../services/salesService');
const { logAction } = require('../services/auditService');

const createSale = async (req, res, next) => {
  try {
    const sale = await salesService.createSale(req.businessId, req.user.userId, req.body);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'CREATE_SALE',
      module: 'SALES',
      entityId: sale._id,
      newData: sale.toObject()
    });

    res.status(201).json({
      success: true,
      message: 'Sale transaction created successfully',
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await salesService.getSaleById(req.businessId, id);
    res.status(200).json({
      success: true,
      message: 'Sale details retrieved successfully',
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

const getAllSales = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const result = await salesService.getAllSales(req.businessId, { page, limit, search });
    res.status(200).json({
      success: true,
      message: 'Sales invoices fetched successfully',
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

const cancelSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldSale = await salesService.getSaleById(req.businessId, id);
    const sale = await salesService.cancelSale(req.businessId, req.user.userId, id);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'CANCEL_SALE',
      module: 'SALES',
      entityId: id,
      oldData: oldSale.toObject(),
      newData: sale.toObject()
    });

    res.status(200).json({
      success: true,
      message: 'Sale invoice cancelled and stock restored successfully',
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSale,
  getSaleById,
  getAllSales,
  cancelSale
};
