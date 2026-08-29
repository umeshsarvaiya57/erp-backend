const Category = require('../models/Category');
const AppError = require('../utils/AppError');

const createCategory = async (businessId, data) => {
  const { name, description } = data;
  if (!name) {
    throw new AppError('Category name is required', 400, 'BAD_REQUEST');
  }

  // Ensure category name is unique within this business scope
  const exists = await Category.findOne({ businessId, name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (exists) {
    throw new AppError(`Category with name "${name}" already exists`, 400, 'DUPLICATE_CATEGORY');
  }

  return await Category.create({
    businessId,
    name,
    description
  });
};

const updateCategory = async (businessId, categoryId, data) => {
  const { name, description, isActive } = data;

  if (name) {
    const exists = await Category.findOne({
      businessId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: categoryId }
    });
    if (exists) {
      throw new AppError(`Category with name "${name}" already exists`, 400, 'DUPLICATE_CATEGORY');
    }
  }

  const category = await Category.findOneAndUpdate(
    { _id: categoryId, businessId },
    { $set: { name, description, isActive } },
    { new: true, runValidators: true }
  );

  if (!category) {
    throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  return category;
};

const deleteCategory = async (businessId, categoryId) => {
  const category = await Category.findOneAndDelete({ _id: categoryId, businessId });
  if (!category) {
    throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }
  return category;
};

const getAllCategories = async (businessId, { search = '', isActive } = {}) => {
  const query = { businessId };
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }
  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  return await Category.find(query).sort({ name: 1 });
};

module.exports = {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories
};
