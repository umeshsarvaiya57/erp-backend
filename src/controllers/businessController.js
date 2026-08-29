const businessService = require('../services/businessService');
const { uploadImage } = require('../config/cloudinary');
const { logAction } = require('../services/auditService');
const AppError = require('../utils/AppError');

const getBusiness = async (req, res, next) => {
  try {
    const business = await businessService.getBusiness(req.businessId);
    res.status(200).json({
      success: true,
      message: 'Business profile fetched successfully',
      data: business
    });
  } catch (error) {
    next(error);
  }
};

const updateBusiness = async (req, res, next) => {
  try {
    const oldBusiness = await businessService.getBusiness(req.businessId);
    
    // Process logo upload if present
    const updateData = { ...req.body };
    if (req.file) {
      const logoUrl = await uploadImage(req.file);
      updateData.logo = logoUrl;
    }

    const updatedBusiness = await businessService.updateBusiness(req.businessId, req.user.userId, updateData);

    // Record audit log
    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'UPDATE_BUSINESS',
      module: 'SETTINGS',
      entityId: req.businessId,
      oldData: oldBusiness.toObject(),
      newData: updatedBusiness.toObject()
    });

    res.status(200).json({
      success: true,
      message: 'Business profile updated successfully',
      data: updatedBusiness
    });
  } catch (error) {
    next(error);
  }
};

const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No logo image file was uploaded', 400, 'BAD_REQUEST');
    }

    const oldBusiness = await businessService.getBusiness(req.businessId);
    
    // Upload image to Cloudinary (or local fallback)
    const logoUrl = await uploadImage(req.file);

    // Update business profile
    const updatedBusiness = await businessService.updateLogo(req.businessId, logoUrl);

    // Record audit log
    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'UPDATE_BUSINESS_LOGO',
      module: 'SETTINGS',
      entityId: req.businessId,
      oldData: { logo: oldBusiness.logo },
      newData: { logo: logoUrl }
    });

    res.status(200).json({
      success: true,
      message: 'Business logo uploaded successfully',
      data: updatedBusiness
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBusiness,
  updateBusiness,
  uploadLogo
};
