const Customer = require('../models/Customer');
const AppError = require('../utils/AppError');

const createCustomer = async (businessId, data) => {
  const { 
    name, mobile, email, address, city, state, 
    pincode, gstNumber, panNumber, creditLimit, openingBalance 
  } = data;

  if (!name || !mobile) {
    throw new AppError('Customer name and mobile number are required fields.', 400, 'BAD_REQUEST');
  }

  // Validate mobile uniqueness within tenant business scope
  const exists = await Customer.findOne({ businessId, mobile });
  if (exists) {
    throw new AppError(`A customer with mobile number "${mobile}" already exists.`, 400, 'DUPLICATE_CUSTOMER');
  }

  const opBal = Number(openingBalance) || 0;

  return await Customer.create({
    businessId,
    name,
    mobile,
    email,
    address,
    city,
    state,
    pincode,
    gstNumber,
    panNumber,
    creditLimit: creditLimit || 0,
    openingBalance: opBal,
    balance: opBal
  });
};

const updateCustomer = async (businessId, customerId, data) => {
  delete data.businessId;
  delete data.balance; // balance must not be edited directly

  if (data.mobile) {
    const exists = await Customer.findOne({ businessId, mobile: data.mobile, _id: { $ne: customerId } });
    if (exists) {
      throw new AppError(`A customer with mobile number "${data.mobile}" already exists.`, 400, 'DUPLICATE_CUSTOMER');
    }
  }

  const customer = await Customer.findOneAndUpdate(
    { _id: customerId, businessId },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!customer) {
    throw new AppError('Customer not found in this shop database.', 404, 'CUSTOMER_NOT_FOUND');
  }

  return customer;
};

const deleteCustomer = async (businessId, customerId) => {
  const customer = await Customer.findOneAndDelete({ _id: customerId, businessId });
  if (!customer) {
    throw new AppError('Customer not found in this shop database.', 404, 'CUSTOMER_NOT_FOUND');
  }
  return customer;
};

const getCustomerById = async (businessId, customerId) => {
  const customer = await Customer.findOne({ _id: customerId, businessId });
  if (!customer) {
    throw new AppError('Customer not found in this shop database.', 404, 'CUSTOMER_NOT_FOUND');
  }
  return customer;
};

const getAllCustomers = async (businessId, { page = 1, limit = 20, search = '' }) => {
  const query = { businessId };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await Customer.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const data = await Customer.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
};

module.exports = {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerById,
  getAllCustomers
};
