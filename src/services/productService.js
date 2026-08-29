const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const AppError = require('../utils/AppError');

const createProduct = async (businessId, userId, data) => {
  const { 
    name, sku, barcode, categoryId, brandId, unit, 
    purchasePrice, sellingPrice, mrp, gstRate, quantity, 
    minimumStock, description, images 
  } = data;

  if (!name || !sku || purchasePrice === undefined || sellingPrice === undefined) {
    throw new AppError('Product name, SKU code, purchase price, and selling price are required fields.', 400, 'BAD_REQUEST');
  }

  // Ensure SKU uniqueness within the tenant business scope
  const skuExists = await Product.findOne({ businessId, sku });
  if (skuExists) {
    throw new AppError(`A product with SKU code "${sku}" already exists in your inventory.`, 400, 'DUPLICATE_SKU');
  }

  const initialQty = Number(quantity) || 0;

  const product = await Product.create({
    businessId,
    name,
    sku,
    barcode,
    categoryId: categoryId || null,
    brandId: brandId || null,
    unit: unit || 'PCS',
    purchasePrice,
    sellingPrice,
    mrp: mrp || sellingPrice,
    gstRate: gstRate || 0,
    quantity: initialQty,
    minimumStock: minimumStock || 0,
    description,
    images: images || [],
    createdBy: userId
  });

  // Record opening inventory transaction if opening quantity was registered
  if (initialQty > 0) {
    await InventoryTransaction.create({
      businessId,
      productId: product._id,
      type: 'OPENING',
      quantity: initialQty,
      previousQuantity: 0,
      newQuantity: initialQty,
      reason: 'Opening stock registration',
      createdBy: userId
    });
  }

  return product;
};

const updateProduct = async (businessId, productId, userId, data) => {
  // Prevent quantity from being updated directly via product profile editor
  delete data.quantity;
  delete data.businessId;

  // If SKU is being updated, verify uniqueness remains intact
  if (data.sku) {
    const skuExists = await Product.findOne({ businessId, sku: data.sku, _id: { $ne: productId } });
    if (skuExists) {
      throw new AppError(`A product with SKU code "${data.sku}" already exists in your inventory.`, 400, 'DUPLICATE_SKU');
    }
  }

  const product = await Product.findOneAndUpdate(
    { _id: productId, businessId },
    { $set: { ...data, updatedBy: userId } },
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new AppError('Product not found in this shop database.', 404, 'PRODUCT_NOT_FOUND');
  }

  return product;
};

const deleteProduct = async (businessId, productId) => {
  const product = await Product.findOneAndDelete({ _id: productId, businessId });
  if (!product) {
    throw new AppError('Product not found in this shop database.', 404, 'PRODUCT_NOT_FOUND');
  }
  return product;
};

const getProductById = async (businessId, productId) => {
  const product = await Product.findOne({ _id: productId, businessId })
    .populate('categoryId', 'name')
    .populate('brandId', 'name');
    
  if (!product) {
    throw new AppError('Product not found in this shop database.', 404, 'PRODUCT_NOT_FOUND');
  }
  return product;
};

const getAllProducts = async (businessId, { page = 1, limit = 20, search = '', categoryId, brandId, isActive }) => {
  const query = { businessId };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } }
    ];
  }

  if (categoryId) query.categoryId = categoryId;
  if (brandId) query.brandId = brandId;
  if (isActive !== undefined) query.isActive = isActive;

  const total = await Product.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const data = await Product.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('categoryId', 'name')
    .populate('brandId', 'name');

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
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getAllProducts
};
