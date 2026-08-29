const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Activity = require('../models/Activity');

const getDashboardStats = async (businessId) => {
  // Calculate sales summary
  const salesData = await Sale.aggregate([
    { $match: { businessId, status: 'COMPLETED' } },
    { 
      $group: { 
        _id: null, 
        total: { $sum: '$grandTotal' }, 
        paid: { $sum: '$paidAmount' }, 
        due: { $sum: '$dueAmount' } 
      } 
    }
  ]);
  
  // Calculate purchase expenditures
  const purchaseData = await Purchase.aggregate([
    { $match: { businessId, status: 'COMPLETED' } },
    { $group: { _id: null, total: { $sum: '$grandTotal' } } }
  ]);

  // Outstanding customer receivables
  const customerData = await Customer.aggregate([
    { $match: { businessId } },
    { $group: { _id: null, due: { $sum: '$balance' } } }
  ]);

  // Outstanding supplier payables
  const supplierData = await Supplier.aggregate([
    { $match: { businessId } },
    { $group: { _id: null, due: { $sum: '$balance' } } }
  ]);

  // Low stock products count
  const lowStockCount = await Product.countDocuments({
    businessId,
    isActive: true,
    $expr: { $lte: ['$quantity', '$minimumStock'] }
  });

  const totalProducts = await Product.countDocuments({ businessId });

  // Compile daily sales/purchases charts data for the last 7 days
  const chartDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    chartDays.push(d);
  }

  const chartData = [];
  for (const day of chartDays) {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const daySales = await Sale.aggregate([
      { $match: { businessId, status: 'COMPLETED', createdAt: { $gte: day, $lt: nextDay } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);

    const dayPurchases = await Purchase.aggregate([
      { $match: { businessId, status: 'COMPLETED', createdAt: { $gte: day, $lt: nextDay } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);

    chartData.push({
      date: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      sales: Math.round((daySales[0]?.total || 0) * 100) / 100,
      purchases: Math.round((dayPurchases[0]?.total || 0) * 100) / 100
    });
  }

  // Identify top 5 products sold by volume
  const topProducts = await Sale.aggregate([
    { $match: { businessId, status: 'COMPLETED' } },
    { $unwind: '$items' },
    { 
      $group: { 
        _id: '$items.productId', 
        name: { $first: '$items.productName' }, 
        quantity: { $sum: '$items.quantity' }, 
        revenue: { $sum: '$items.total' } 
      } 
    },
    { $sort: { quantity: -1 } },
    { $limit: 5 }
  ]);

  // Load recent 5 timeline activities
  const recentActivities = await Activity.find({ businessId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('createdBy', 'name');

  return {
    metrics: {
      totalSales: Math.round((salesData[0]?.total || 0) * 100) / 100,
      totalPaidSales: Math.round((salesData[0]?.paid || 0) * 100) / 100,
      totalDueSales: Math.round((salesData[0]?.due || 0) * 100) / 100,
      totalPurchases: Math.round((purchaseData[0]?.total || 0) * 100) / 100,
      customerOutstandings: Math.round((customerData[0]?.due || 0) * 100) / 100,
      supplierOutstandings: Math.round((supplierData[0]?.due || 0) * 100) / 100,
      lowStockCount,
      totalProducts
    },
    chartData,
    topProducts,
    recentActivities
  };
};

module.exports = {
  getDashboardStats
};
