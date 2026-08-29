const supplierService = require('../services/supplierService');
const { logAction } = require('../services/auditService');

const createSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.createSupplier(req.businessId, req.body);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'CREATE_SUPPLIER',
      module: 'CRM',
      entityId: supplier._id,
      newData: supplier.toObject()
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldSupplier = await supplierService.getSupplierById(req.businessId, id);
    const supplier = await supplierService.updateSupplier(req.businessId, id, req.body);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'UPDATE_SUPPLIER',
      module: 'CRM',
      entityId: id,
      oldData: oldSupplier.toObject(),
      newData: supplier.toObject()
    });

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

const deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldSupplier = await supplierService.getSupplierById(req.businessId, id);
    await supplierService.deleteSupplier(req.businessId, id);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'DELETE_SUPPLIER',
      module: 'CRM',
      entityId: id,
      oldData: oldSupplier.toObject()
    });

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getSupplierById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const supplier = await supplierService.getSupplierById(req.businessId, id);
    res.status(200).json({
      success: true,
      message: 'Supplier fetched successfully',
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

const getAllSuppliers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const result = await supplierService.getAllSuppliers(req.businessId, { page, limit, search });
    res.status(200).json({
      success: true,
      message: 'Suppliers fetched successfully',
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierById,
  getAllSuppliers
};
