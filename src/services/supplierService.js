const Supplier = require('../models/Supplier');
const AppError = require('../utils/AppError');

const createSupplier = async (businessId, data) => {
  const { name, companyName, mobile, email, address, gstNumber, panNumber, openingBalance } = data;

  if (!name || !mobile) {
    throw new AppError('Supplier name and mobile number are required fields.', 400, 'BAD_REQUEST');
  }

  const exists = await Supplier.findOne({ businessId, mobile });
  if (exists) {
    throw new AppError(`A supplier with mobile number "${mobile}" already exists.`, 400, 'DUPLICATE_SUPPLIER');
  }

  const opBal = Number(openingBalance) || 0;

  return await Supplier.create({
    businessId,
    name,
    companyName,
    mobile,
    email,
    address,
    gstNumber,
    panNumber,
    openingBalance: opBal,
    balance: opBal
  });
};

const updateSupplier = async (businessId, supplierId, data) => {
  delete data.businessId;
  delete data.balance; // balance must not be edited directly

  if (data.mobile) {
    const exists = await Supplier.findOne({ businessId, mobile: data.mobile, _id: { $ne: supplierId } });
    if (exists) {
      throw new AppError(`A supplier with mobile number "${data.mobile}" already exists.`, 400, 'DUPLICATE_SUPPLIER');
    }
  }

  const supplier = await Supplier.findOneAndUpdate(
    { _id: supplierId, businessId },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!supplier) {
    throw new AppError('Supplier not found in this shop database.', 404, 'SUPPLIER_NOT_FOUND');
  }

  return supplier;
};

const deleteSupplier = async (businessId, supplierId) => {
  const supplier = await Supplier.findOneAndDelete({ _id: supplierId, businessId });
  if (!supplier) {
    throw new AppError('Supplier not found in this shop database.', 404, 'SUPPLIER_NOT_FOUND');
  }
  return supplier;
};

const getSupplierById = async (businessId, supplierId) => {
  const supplier = await Supplier.findOne({ _id: supplierId, businessId });
  if (!supplier) {
    throw new AppError('Supplier not found in this shop database.', 404, 'SUPPLIER_NOT_FOUND');
  }
  return supplier;
};

const getAllSuppliers = async (businessId, { page = 1, limit = 20, search = '' }) => {
  const query = { businessId };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await Supplier.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const data = await Supplier.find(query)
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
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierById,
  getAllSuppliers
};
