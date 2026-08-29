const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Business = require('../models/Business');
const InventoryTransaction = require('../models/InventoryTransaction');
const AppError = require('../utils/AppError');

const createPurchase = async (businessId, userId, purchaseData) => {
  const { supplierId, items, paidAmount = 0, paymentMethod = 'CASH', notes } = purchaseData;

  if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Supplier ID and at least one item are required.', 400, 'BAD_REQUEST');
  }

  const business = await Business.findById(businessId);
  if (!business) {
    throw new AppError('Business tenant profile not found.', 404, 'BUSINESS_NOT_FOUND');
  }

  const supplier = await Supplier.findOne({ _id: supplierId, businessId });
  if (!supplier) {
    throw new AppError('Supplier not found.', 404, 'SUPPLIER_NOT_FOUND');
  }

  let calculatedSubtotal = 0;
  let calculatedDiscountTotal = 0;
  let calculatedGstTotal = 0;
  const processedItems = [];

  // Recalculate financials based on purchase catalog prices
  for (const item of items) {
    const product = await Product.findOne({ _id: item.productId, businessId });
    if (!product) {
      throw new AppError(`Product with ID "${item.productId}" not found.`, 404, 'PRODUCT_NOT_FOUND');
    }

    const rate = product.purchasePrice; // Authoritative price from DB
    const discount = Number(item.discount) || 0;
    const itemSubtotal = (rate - discount) * item.quantity;
    
    const gstRate = product.gstRate || 0;
    const gstAmount = (itemSubtotal * gstRate) / 100;
    const itemTotal = itemSubtotal + gstAmount;

    calculatedSubtotal += rate * item.quantity;
    calculatedDiscountTotal += discount * item.quantity;
    calculatedGstTotal += gstAmount;

    processedItems.push({
      productId: product._id,
      productName: product.name,
      quantity: item.quantity,
      rate,
      discount,
      gstRate,
      gstAmount: Math.round(gstAmount * 100) / 100,
      total: Math.round(itemTotal * 100) / 100
    });
  }

  const grandTotal = calculatedSubtotal - calculatedDiscountTotal + calculatedGstTotal;
  const dueAmount = grandTotal - Number(paidAmount);

  // Determine state-based tax split
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  const isInterState = supplier.state && business.state && 
    supplier.state.trim().toLowerCase() !== business.state.trim().toLowerCase();

  if (isInterState) {
    igst = Math.round(calculatedGstTotal * 100) / 100;
  } else {
    cgst = Math.round((calculatedGstTotal / 2) * 100) / 100;
    sgst = Math.round((calculatedGstTotal / 2) * 100) / 100;
  }

  // Atomically generate purchase sequence number
  let purchaseNumber;
  const prefix = 'PUR';
  let count = await Purchase.countDocuments({ businessId });
  let exists = true;
  while (exists) {
    const nextNum = String(count + 1).padStart(6, '0');
    purchaseNumber = `${prefix}-${nextNum}`;
    const found = await Purchase.findOne({ businessId, purchaseNumber });
    if (!found) {
      exists = false;
    } else {
      count++;
    }
  }

  // Update inventory level and register transaction history
  for (const item of processedItems) {
    const product = await Product.findOne({ _id: item.productId, businessId });
    const prevQty = product.quantity;
    product.quantity = prevQty + item.quantity;
    await product.save();

    await InventoryTransaction.create({
      businessId,
      productId: item.productId,
      type: 'PURCHASE',
      quantity: item.quantity,
      previousQuantity: prevQty,
      newQuantity: product.quantity,
      reason: `Purchase stock: ${purchaseNumber}`,
      createdBy: userId
    });
  }

  // Update supplier outstanding balance
  supplier.balance = Math.round((supplier.balance + dueAmount) * 100) / 100;
  await supplier.save();

  // Save purchase document
  const purchase = await Purchase.create({
    businessId,
    purchaseNumber,
    supplierId: supplier._id,
    items: processedItems,
    subtotal: Math.round(calculatedSubtotal * 100) / 100,
    discountTotal: Math.round(calculatedDiscountTotal * 100) / 100,
    gstTotal: Math.round(calculatedGstTotal * 100) / 100,
    cgst,
    sgst,
    igst,
    grandTotal: Math.round(grandTotal * 100) / 100,
    paidAmount: Math.round(Number(paidAmount) * 100) / 100,
    dueAmount: Math.round(dueAmount * 100) / 100,
    paymentMethod,
    status: 'COMPLETED',
    notes,
    createdBy: userId
  });

  return purchase;
};

const getPurchaseById = async (businessId, purchaseId) => {
  const purchase = await Purchase.findOne({ _id: purchaseId, businessId })
    .populate('supplierId')
    .populate('createdBy', 'name');

  if (!purchase) {
    throw new AppError('Purchase order not found.', 404, 'PURCHASE_NOT_FOUND');
  }
  return purchase;
};

const getAllPurchases = async (businessId, { page = 1, limit = 20, search = '' }) => {
  const query = { businessId };

  if (search) {
    query.purchaseNumber = { $regex: search, $options: 'i' };
  }

  const total = await Purchase.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const data = await Purchase.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('supplierId', 'name mobile');

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
  createPurchase,
  getPurchaseById,
  getAllPurchases
};
