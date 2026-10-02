const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Activity = require('../models/Activity');

const getDashboardStats = async (businessId) => {
  if (!businessId) {
    return {
      metrics: {
        totalSales: 0,
        totalPaidSales: 0,
        totalDueSales: 0,
        totalInvoices: 0,
        todaySales: 0,
        todayInvoices: 0,
        totalPurchases: 0,
        totalPurchaseOrders: 0,
        customerOutstandings: 0,
        totalCustomers: 0,
        supplierOutstandings: 0,
        totalSuppliers: 0,
        lowStockCount: 0,
        totalProducts: 0
      },
      chartData: [],
      topProducts: [],
      lowStockProducts: [],
      recentActivities: [],
      recentSales: []
    };
  }

  // Ensure businessId is properly cast to ObjectId for Mongo aggregations
  const bId = mongoose.Types.ObjectId.isValid(businessId)
    ? new mongoose.Types.ObjectId(businessId)
    : businessId;

  // 1. Calculate overall sales summary
  const salesData = await Sale.aggregate([
    { $match: { businessId: bId, status: { $ne: 'CANCELLED' } } },
    { 
      $group: { 
        _id: null, 
        total: { $sum: '$grandTotal' }, 
        paid: { $sum: '$paidAmount' }, 
        due: { $sum: '$dueAmount' },
        count: { $sum: 1 }
      } 
    }
  ]);

  // 2. Calculate today's sales summary
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todaySalesData = await Sale.aggregate([
    { 
      $match: { 
        businessId: bId, 
        status: { $ne: 'CANCELLED' }, 
        createdAt: { $gte: todayStart, $lte: todayEnd } 
      } 
    },
    { 
      $group: { 
        _id: null, 
        total: { $sum: '$grandTotal' },
        count: { $sum: 1 }
      } 
    }
  ]);
  
  // 3. Calculate purchase expenditures
  const purchaseData = await Purchase.aggregate([
    { $match: { businessId: bId, status: { $ne: 'CANCELLED' } } },
    { 
      $group: { 
        _id: null, 
        total: { $sum: '$grandTotal' },
        count: { $sum: 1 }
      } 
    }
  ]);

  // 4. Outstanding customer receivables & total customers
  const customerData = await Customer.aggregate([
    { $match: { businessId: bId } },
    { 
      $group: { 
        _id: null, 
        due: { $sum: '$balance' },
        count: { $sum: 1 }
      } 
    }
  ]);

  // 5. Outstanding supplier payables & total suppliers
  const supplierData = await Supplier.aggregate([
    { $match: { businessId: bId } },
    { 
      $group: { 
        _id: null, 
        due: { $sum: '$balance' },
        count: { $sum: 1 }
      } 
    }
  ]);

  // 6. Low stock products count and low stock items list
  const lowStockCount = await Product.countDocuments({
    businessId: bId,
    isActive: true,
    $or: [
      { $expr: { $lte: ['$quantity', '$minimumStock'] } },
      { quantity: { $lte: 0 } }
    ]
  });

  const lowStockProducts = await Product.find({
    businessId: bId,
    isActive: true,
    $or: [
      { $expr: { $lte: ['$quantity', '$minimumStock'] } },
      { quantity: { $lte: 0 } }
    ]
  })
    .sort({ quantity: 1 })
    .limit(5)
    .select('name sku quantity minimumStock unit sellingPrice');

  const totalProducts = await Product.countDocuments({ businessId: bId, isActive: true });

  // 7. Compile daily sales/purchases charts data for the last 7 days using grouped aggregation
  const numDays = 7;
  const startDay = new Date();
  startDay.setDate(startDay.getDate() - (numDays - 1));
  startDay.setHours(0, 0, 0, 0);

  const [salesByDay, purchasesByDay] = await Promise.all([
    Sale.aggregate([
      { 
        $match: { 
          businessId: bId, 
          status: { $ne: 'CANCELLED' }, 
          createdAt: { $gte: startDay } 
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: '$grandTotal' }
        }
      }
    ]),
    Purchase.aggregate([
      { 
        $match: { 
          businessId: bId, 
          status: { $ne: 'CANCELLED' }, 
          createdAt: { $gte: startDay } 
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: '$grandTotal' }
        }
      }
    ])
  ]);

  const salesMap = {};
  salesByDay.forEach(item => {
    salesMap[item._id] = item.total;
  });

  const purchasesMap = {};
  purchasesByDay.forEach(item => {
    purchasesMap[item._id] = item.total;
  });

  const chartData = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    chartData.push({
      date: dateLabel,
      dateKey,
      sales: Math.round((salesMap[dateKey] || 0) * 100) / 100,
      purchases: Math.round((purchasesMap[dateKey] || 0) * 100) / 100
    });
  }

  // 8. Identify top 5 products sold by volume
  const topProducts = await Sale.aggregate([
    { $match: { businessId: bId, status: { $ne: 'CANCELLED' } } },
    { $unwind: '$items' },
    { 
      $group: { 
        _id: '$items.productId', 
        name: { $first: '$items.productName' }, 
        quantity: { $sum: '$items.quantity' }, 
        revenue: { $sum: '$items.total' } 
      } 
    },
    { $sort: { quantity: -1, revenue: -1 } },
    { $limit: 5 }
  ]);

  // 9. Load recent 8 timeline activities
  const recentActivities = await Activity.find({ businessId: bId })
    .sort({ createdAt: -1 })
    .limit(8)
    .populate('createdBy', 'name');

  // 10. Load recent 5 completed sales invoices for quick overview
  const recentSales = await Sale.find({ businessId: bId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('customerId', 'name mobile')
    .populate('createdBy', 'name')
    .select('invoiceNumber grandTotal paidAmount dueAmount paymentMethod status createdAt customerId createdBy');

  return {
    metrics: {
      totalSales: Math.round((salesData[0]?.total || 0) * 100) / 100,
      totalPaidSales: Math.round((salesData[0]?.paid || 0) * 100) / 100,
      totalDueSales: Math.round((salesData[0]?.due || 0) * 100) / 100,
      totalInvoices: salesData[0]?.count || 0,
      todaySales: Math.round((todaySalesData[0]?.total || 0) * 100) / 100,
      todayInvoices: todaySalesData[0]?.count || 0,
      totalPurchases: Math.round((purchaseData[0]?.total || 0) * 100) / 100,
      totalPurchaseOrders: purchaseData[0]?.count || 0,
      customerOutstandings: Math.round((customerData[0]?.due || 0) * 100) / 100,
      totalCustomers: customerData[0]?.count || 0,
      supplierOutstandings: Math.round((supplierData[0]?.due || 0) * 100) / 100,
      totalSuppliers: supplierData[0]?.count || 0,
      lowStockCount,
      totalProducts
    },
    chartData,
    topProducts: topProducts.map(p => ({
      _id: p._id,
      name: p.name,
      quantity: p.quantity,
      revenue: Math.round((p.revenue || 0) * 100) / 100
    })),
    lowStockProducts,
    recentActivities,
    recentSales
  };
};

module.exports = {
  getDashboardStats
};
