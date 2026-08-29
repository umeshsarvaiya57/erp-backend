const reportService = require('../services/reportService');

const getFinancialReport = async (req, res, next) => {
  try {
    const report = await reportService.getFinancialReport(req.businessId);
    res.status(200).json({
      success: true,
      message: 'Financial reports compiled successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFinancialReport
};
