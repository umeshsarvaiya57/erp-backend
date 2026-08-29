const productService = require('../services/productService');
const { logAction } = require('../services/auditService');

const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.businessId, req.user.userId, req.body);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'CREATE_PRODUCT',
      module: 'INVENTORY',
      entityId: product._id,
      newData: product.toObject()
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldProduct = await productService.getProductById(req.businessId, id);
    const product = await productService.updateProduct(req.businessId, id, req.user.userId, req.body);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'UPDATE_PRODUCT',
      module: 'INVENTORY',
      entityId: id,
      oldData: oldProduct.toObject(),
      newData: product.toObject()
    });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldProduct = await productService.getProductById(req.businessId, id);
    await productService.deleteProduct(req.businessId, id);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'DELETE_PRODUCT',
      module: 'INVENTORY',
      entityId: id,
      oldData: oldProduct.toObject()
    });

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(req.businessId, id);
    res.status(200).json({
      success: true,
      message: 'Product fetched successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

const getAllProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const categoryId = req.query.categoryId || null;
    const brandId = req.query.brandId || null;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const result = await productService.getAllProducts(req.businessId, {
      page,
      limit,
      search,
      categoryId,
      brandId,
      isActive
    });

    res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getAllProducts
};
