const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const AppError = require('../utils/AppError');

const adjustStock = async (businessId, userId, adjustData) => {
  const { productId, type, quantity, reason } = adjustData;

  if (!productId || !type || quantity === undefined) {
    throw new AppError('Product ID, adjustment type (ADJUSTMENT_IN/ADJUSTMENT_OUT), and adjustment quantity are required fields.', 400, 'BAD_REQUEST');
  }

  if (!['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'].includes(type)) {
    throw new AppError('Invalid adjustment type. Must be ADJUSTMENT_IN or ADJUSTMENT_OUT.', 400, 'BAD_REQUEST');
  }

  const adjQty = Number(quantity);
  if (adjQty <= 0) {
    throw new AppError('Adjustment quantity must be greater than zero.', 400, 'BAD_REQUEST');
  }

  // Retrieve product and check tenant scope
  const product = await Product.findOne({ _id: productId, businessId });
  if (!product) {
    throw new AppError('Product not found in this shop database.', 404, 'PRODUCT_NOT_FOUND');
  }

  const previousQuantity = product.quantity;
  let newQuantity;

  if (type === 'ADJUSTMENT_IN') {
    newQuantity = previousQuantity + adjQty;
  } else {
    newQuantity = previousQuantity - adjQty;
    if (newQuantity < 0) {
      throw new AppError(`Adjustment failed. Insufficient stock. Current level is ${previousQuantity}, cannot subtract ${adjQty}.`, 400, 'INSUFFICIENT_STOCK');
    }
  }

  // Save new inventory level
  product.quantity = newQuantity;
  await product.save();

  // Record history log
  const transaction = await InventoryTransaction.create({
    businessId,
    productId,
    type,
    quantity: adjQty,
    previousQuantity,
    newQuantity,
    reason: reason || 'Manual stock level adjustment',
    createdBy: userId
  });

  return {
    product,
    transaction
  };
};

const getInventoryHistory = async (businessId, { page = 1, limit = 20, productId }) => {
  const query = { businessId };
  if (productId) {
    query.productId = productId;
  }

  const total = await InventoryTransaction.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const data = await InventoryTransaction.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('productId', 'name sku unit')
    .populate('createdBy', 'name');

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
  adjustStock,
  getInventoryHistory
};
