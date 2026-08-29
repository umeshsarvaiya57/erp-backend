const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');

const getFinancialReport = async (businessId) => {
  // Aggregate sales tax values
  const salesTaxData = await Sale.aggregate([
    { $match: { businessId, status: 'COMPLETED' } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$grandTotal' },
        taxCollected: { $sum: '$gstTotal' },
        cgst: { $sum: '$cgst' },
        sgst: { $sum: '$sgst' },
        igst: { $sum: '$igst' }
      }
    }
  ]);

  // Aggregate purchase tax values
  const purchaseTaxData = await Purchase.aggregate([
    { $match: { businessId, status: 'COMPLETED' } },
    {
      $group: {
        _id: null,
        totalPurchases: { $sum: '$grandTotal' },
        taxPaid: { $sum: '$gstTotal' },
        cgst: { $sum: '$cgst' },
        sgst: { $sum: '$sgst' },
        igst: { $sum: '$igst' }
      }
    }
  ]);

  const salesTax = salesTaxData[0] || { totalSales: 0, taxCollected: 0, cgst: 0, sgst: 0, igst: 0 };
  const purchaseTax = purchaseTaxData[0] || { totalPurchases: 0, taxPaid: 0, cgst: 0, sgst: 0, igst: 0 };

  const netGstPayable = salesTax.taxCollected - purchaseTax.taxPaid;
  const estimatedProfit = salesTax.totalSales - purchaseTax.totalPurchases;

  return {
    salesSummary: {
      revenue: Math.round(salesTax.totalSales * 100) / 100,
      gstCollected: Math.round(salesTax.taxCollected * 100) / 100,
      cgst: Math.round(salesTax.cgst * 100) / 100,
      sgst: Math.round(salesTax.sgst * 100) / 100,
      igst: Math.round(salesTax.igst * 100) / 100
    },
    purchasesSummary: {
      expenditure: Math.round(purchaseTax.totalPurchases * 100) / 100,
      gstPaid: Math.round(purchaseTax.taxPaid * 100) / 100,
      cgst: Math.round(purchaseTax.cgst * 100) / 100,
      sgst: Math.round(purchaseTax.sgst * 100) / 100,
      igst: Math.round(purchaseTax.igst * 100) / 100
    },
    gstPayableSummary: {
      netPayable: Math.round(netGstPayable * 100) / 100,
      isCredit: netGstPayable < 0
    },
    profitSummary: {
      grossProfit: Math.round(estimatedProfit * 100) / 100,
      margin: salesTax.totalSales > 0 ? Math.round((estimatedProfit / salesTax.totalSales) * 10000) / 100 : 0
    }
  };
};

module.exports = {
  getFinancialReport
};
