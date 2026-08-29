const Brand = require('../models/Brand');
const AppError = require('../utils/AppError');

const createBrand = async (businessId, data) => {
  const { name, description } = data;
  if (!name) {
    throw new AppError('Brand name is required', 400, 'BAD_REQUEST');
  }

  const exists = await Brand.findOne({ businessId, name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (exists) {
    throw new AppError(`Brand with name "${name}" already exists`, 400, 'DUPLICATE_BRAND');
  }

  return await Brand.create({
    businessId,
    name,
    description
  });
};

const updateBrand = async (businessId, brandId, data) => {
  const { name, description } = data;

  if (name) {
    const exists = await Brand.findOne({
      businessId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: brandId }
    });
    if (exists) {
      throw new AppError(`Brand with name "${name}" already exists`, 400, 'DUPLICATE_BRAND');
    }
  }

  const brand = await Brand.findOneAndUpdate(
    { _id: brandId, businessId },
    { $set: { name, description } },
    { new: true, runValidators: true }
  );

  if (!brand) {
    throw new AppError('Brand not found', 404, 'BRAND_NOT_FOUND');
  }

  return brand;
};

const deleteBrand = async (businessId, brandId) => {
  const brand = await Brand.findOneAndDelete({ _id: brandId, businessId });
  if (!brand) {
    throw new AppError('Brand not found', 404, 'BRAND_NOT_FOUND');
  }
  return brand;
};

const getAllBrands = async (businessId, { search = '' } = {}) => {
  const query = { businessId };
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  return await Brand.find(query).sort({ name: 1 });
};

module.exports = {
  createBrand,
  updateBrand,
  deleteBrand,
  getAllBrands
};
