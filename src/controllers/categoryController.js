const categoryService = require('../services/categoryService');
const brandService = require('../services/brandService');

const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.businessId, req.body);
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await categoryService.updateCategory(req.businessId, id, req.body);
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    await categoryService.deleteCategory(req.businessId, id);
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getAllCategories = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const data = await categoryService.getAllCategories(req.businessId, { search, isActive });
    res.status(200).json({
      success: true,
      message: 'Categories fetched successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

// Brand Operations
const createBrand = async (req, res, next) => {
  try {
    const brand = await brandService.createBrand(req.businessId, req.body);
    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: brand
    });
  } catch (error) {
    next(error);
  }
};

const updateBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const brand = await brandService.updateBrand(req.businessId, id, req.body);
    res.status(200).json({
      success: true,
      message: 'Brand updated successfully',
      data: brand
    });
  } catch (error) {
    next(error);
  }
};

const deleteBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    await brandService.deleteBrand(req.businessId, id);
    res.status(200).json({
      success: true,
      message: 'Brand deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getAllBrands = async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const data = await brandService.getAllBrands(req.businessId, { search });
    res.status(200).json({
      success: true,
      message: 'Brands fetched successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
  createBrand,
  updateBrand,
  deleteBrand,
  getAllBrands
};
