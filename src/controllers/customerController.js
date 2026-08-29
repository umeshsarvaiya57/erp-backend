const customerService = require('../services/customerService');
const { logAction } = require('../services/auditService');

const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.businessId, req.body);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'CREATE_CUSTOMER',
      module: 'CRM',
      entityId: customer._id,
      newData: customer.toObject()
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldCustomer = await customerService.getCustomerById(req.businessId, id);
    const customer = await customerService.updateCustomer(req.businessId, id, req.body);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'UPDATE_CUSTOMER',
      module: 'CRM',
      entityId: id,
      oldData: oldCustomer.toObject(),
      newData: customer.toObject()
    });

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldCustomer = await customerService.getCustomerById(req.businessId, id);
    await customerService.deleteCustomer(req.businessId, id);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'DELETE_CUSTOMER',
      module: 'CRM',
      entityId: id,
      oldData: oldCustomer.toObject()
    });

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(req.businessId, id);
    res.status(200).json({
      success: true,
      message: 'Customer fetched successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

const getAllCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const result = await customerService.getAllCustomers(req.businessId, { page, limit, search });
    res.status(200).json({
      success: true,
      message: 'Customers fetched successfully',
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerById,
  getAllCustomers
};
