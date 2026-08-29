const Business = require('../models/Business');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const getBusiness = async (businessId) => {
  const business = await Business.findById(businessId);
  if (!business) {
    throw new AppError('Business profile not found', 404, 'BUSINESS_NOT_FOUND');
  }
  return business;
};

const updateBusiness = async (businessId, userId, updateData) => {
  const business = await Business.findById(businessId);
  if (!business) {
    throw new AppError('Business profile not found', 404, 'BUSINESS_NOT_FOUND');
  }

  // Prevent modifying critical system flags directly unless authorized
  delete updateData.isActive;

  // If this is completing setup, flip profileCompleted flag
  if (!business.profileCompleted) {
    updateData.profileCompleted = true;
  }

  // Update business document
  const updatedBusiness = await Business.findByIdAndUpdate(
    businessId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  // If initial login completed, set user's first login to false
  await User.findByIdAndUpdate(userId, { $set: { isFirstLogin: false } });

  return updatedBusiness;
};

const updateLogo = async (businessId, logoUrl) => {
  const business = await Business.findByIdAndUpdate(
    businessId,
    { $set: { logo: logoUrl } },
    { new: true }
  );
  if (!business) {
    throw new AppError('Business profile not found', 404, 'BUSINESS_NOT_FOUND');
  }
  return business;
};

const createBusiness = async (businessData) => {
  const { name, ownerName, ownerEmail, initialPassword, mobile, businessType } = businessData;

  if (!name || !ownerName || !ownerEmail || !initialPassword) {
    throw new AppError('Business name, owner name, owner email, and initial password are required', 400, 'BAD_REQUEST');
  }

  // Verify email uniqueness
  const emailExists = await User.findOne({ email: ownerEmail });
  if (emailExists) {
    throw new AppError('Email is already registered to a user account', 400, 'EMAIL_ALREADY_EXISTS');
  }

  // Create Business tenant
  const business = await Business.create({
    name,
    businessType,
    mobile,
    email: ownerEmail,
    profileCompleted: false,
    isActive: true
  });

  // Create Owner user context
  const owner = await User.create({
    businessId: business._id,
    name: ownerName,
    email: ownerEmail,
    password: initialPassword,
    mobile,
    role: 'OWNER',
    status: 'ACTIVE',
    isFirstLogin: true,
    permissions: []
  });

  const ownerObj = owner.toObject();
  delete ownerObj.password;

  return {
    business,
    owner: ownerObj
  };
};

const getAllBusinesses = async (page = 1, limit = 20, search = '') => {
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await Business.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const data = await Business.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

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

const updateBusinessStatus = async (businessId, isActive) => {
  const business = await Business.findByIdAndUpdate(
    businessId,
    { $set: { isActive } },
    { new: true }
  );

  if (!business) {
    throw new AppError('Business profile not found', 404, 'BUSINESS_NOT_FOUND');
  }

  // If business is deactivated, suspend all user accounts associated with this tenant
  if (!isActive) {
    await User.updateMany(
      { businessId },
      { $set: { status: 'SUSPENDED' } }
    );
  } else {
    // If reactivated, restore OWNER login privileges
    await User.updateMany(
      { businessId, role: 'OWNER' },
      { $set: { status: 'ACTIVE' } }
    );
  }

  return business;
};

module.exports = {
  getBusiness,
  updateBusiness,
  updateLogo,
  createBusiness,
  getAllBusinesses,
  updateBusinessStatus
};
