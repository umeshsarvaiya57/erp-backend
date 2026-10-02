const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Business = require('../models/Business');
const InventoryTransaction = require('../models/InventoryTransaction');
const Activity = require('../models/Activity');
const AppError = require('../utils/AppError');
const whatsappGatewayService = require('./whatsappGatewayService');

const createSale = async (businessId, userId, saleData) => {
  const { customerId, items, paidAmount = 0, paymentMethod = 'CASH', notes } = saleData;

  if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Customer ID and at least one item are required.', 400, 'BAD_REQUEST');
  }

  // Fetch Business and Customer details for Tax (GST) destination checks
  const business = await Business.findById(businessId);
  if (!business) {
    throw new AppError('Business tenant profile not found.', 404, 'BUSINESS_NOT_FOUND');
  }

  const customer = await Customer.findOne({ _id: customerId, businessId });
  if (!customer) {
    throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
  }

  // Start Mongoose Transaction if session can be used, otherwise fall back to try-catch
  // (In local Dev mongo single node, transactions require replica set; we write a safe sequential flow)
  
  let calculatedSubtotal = 0;
  let calculatedDiscountTotal = 0;
  let calculatedGstTotal = 0;
  const processedItems = [];

  // 1. Recalculate financial totals on backend and check stock levels
  for (const item of items) {
    const product = await Product.findOne({ _id: item.productId, businessId });
    if (!product) {
      throw new AppError(`Product with ID "${item.productId}" not found.`, 404, 'PRODUCT_NOT_FOUND');
    }

    if (product.quantity < item.quantity) {
      throw new AppError(`Insufficient stock for "${product.name}". Available: ${product.quantity}, Requested: ${item.quantity}`, 400, 'INSUFFICIENT_STOCK');
    }

    const rate = product.sellingPrice; // Authoritative price from DB
    const discount = Number(item.discount) || 0; // discount amount per unit
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

  // 2. Determine tax split based on business and customer states (Indian GST rules)
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  const isInterState = customer.state && business.state && 
    customer.state.trim().toLowerCase() !== business.state.trim().toLowerCase();

  if (isInterState) {
    igst = Math.round(calculatedGstTotal * 100) / 100;
  } else {
    cgst = Math.round((calculatedGstTotal / 2) * 100) / 100;
    sgst = Math.round((calculatedGstTotal / 2) * 100) / 100;
  }

  // 3. Atomically generate sequential invoice number per business tenant
  let invoiceNumber;
  const prefix = business.invoicePrefix || 'INV';
  let count = await Sale.countDocuments({ businessId });
  let exists = true;
  while (exists) {
    const nextNum = String(count + 1).padStart(6, '0');
    invoiceNumber = `${prefix}-${nextNum}`;
    const found = await Sale.findOne({ businessId, invoiceNumber });
    if (!found) {
      exists = false;
    } else {
      count++;
    }
  }

  // 4. Update product stocks and record inventory movements
  for (const item of processedItems) {
    const product = await Product.findOne({ _id: item.productId, businessId });
    const prevQty = product.quantity;
    product.quantity = prevQty - item.quantity;
    await product.save();

    await InventoryTransaction.create({
      businessId,
      productId: item.productId,
      type: 'SALE',
      quantity: item.quantity,
      previousQuantity: prevQty,
      newQuantity: product.quantity,
      reason: `Invoice sale: ${invoiceNumber}`,
      createdBy: userId
    });
  }

  // 5. Update customer balance
  customer.balance = Math.round((customer.balance + dueAmount) * 100) / 100;
  await customer.save();

  // 6. Save sale document
  const sale = await Sale.create({
    businessId,
    invoiceNumber,
    customerId: customer._id,
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

  // 7. Record timeline activity for real-time dashboard tracking
  try {
    await Activity.create({
      businessId,
      type: 'INVOICE_GENERATED',
      description: `Generated Invoice #${invoiceNumber} for ${customer.name} - ₹${grandTotal.toFixed(2)}`,
      referenceId: sale._id,
      referenceModel: 'Sale',
      createdBy: userId
    });
  } catch (actErr) {
    console.warn('[Activity Log Error]', actErr.message);
  }

  // 8. Non-blocking automated WhatsApp message delivery via self-hosted Gateway
  try {
    const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0] : 'http://localhost:5173';
    whatsappGatewayService.sendInvoiceNotification(sale, business, customer, clientUrl).catch(err => {
      console.warn('[WhatsApp Auto-Send Background Error]', err.message);
    });
  } catch (waErr) {
    console.warn('[WhatsApp Auto-Send Init Error]', waErr.message);
  }

  return sale;
};

const getPublicSaleById = async (saleId) => {
  if (!mongoose.Types.ObjectId.isValid(saleId)) {
    throw new AppError('Invalid Invoice ID.', 400, 'INVALID_ID');
  }

  const sale = await Sale.findById(saleId)
    .populate('customerId', 'name mobile email address')
    .populate('businessId', 'name mobile email address gstNumber logo')
    .select('-__v');

  if (!sale) {
    throw new AppError('Sale invoice not found.', 404, 'SALE_NOT_FOUND');
  }
  return sale;
};

const getSaleById = async (businessId, saleId) => {
  const sale = await Sale.findOne({ _id: saleId, businessId })
    .populate('customerId')
    .populate('businessId')
    .populate('createdBy', 'name');

  if (!sale) {
    throw new AppError('Sale invoice not found.', 404, 'SALE_NOT_FOUND');
  }
  return sale;
};

const getAllSales = async (businessId, { page = 1, limit = 20, search = '' }) => {
  const query = { businessId };

  if (search) {
    query.invoiceNumber = { $regex: search, $options: 'i' };
  }

  const total = await Sale.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const data = await Sale.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('customerId', 'name mobile');

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

const cancelSale = async (businessId, userId, saleId) => {
  const sale = await Sale.findOne({ _id: saleId, businessId });
  if (!sale) {
    throw new AppError('Sale invoice not found.', 404, 'SALE_NOT_FOUND');
  }

  if (sale.status === 'CANCELLED') {
    throw new AppError('Sale is already cancelled.', 400, 'BAD_REQUEST');
  }

  // 1. Restore product inventory
  for (const item of sale.items) {
    const product = await Product.findOne({ _id: item.productId, businessId });
    if (product) {
      const prevQty = product.quantity;
      product.quantity = prevQty + item.quantity;
      await product.save();

      await InventoryTransaction.create({
        businessId,
        productId: item.productId,
        type: 'SALE_RETURN',
        quantity: item.quantity,
        previousQuantity: prevQty,
        newQuantity: product.quantity,
        reason: `Cancelled Invoice sale: ${sale.invoiceNumber}`,
        createdBy: userId
      });
    }
  }

  // 2. Revert customer balance
  const customer = await Customer.findOne({ _id: sale.customerId, businessId });
  if (customer) {
    customer.balance = Math.round((customer.balance - sale.dueAmount) * 100) / 100;
    await customer.save();
  }

  // 3. Mark sale status as cancelled
  sale.status = 'CANCELLED';
  sale.dueAmount = 0; // no longer owed
  await sale.save();

  // 4. Record timeline activity
  try {
    await Activity.create({
      businessId,
      type: 'INVOICE_CANCELLED',
      description: `Cancelled Invoice #${sale.invoiceNumber} and restored product stock`,
      referenceId: sale._id,
      referenceModel: 'Sale',
      createdBy: userId
    });
  } catch (actErr) {
    console.warn('[Activity Log Error]', actErr.message);
  }

  return sale;
};

module.exports = {
  createSale,
  getSaleById,
  getPublicSaleById,
  getAllSales,
  cancelSale
};
