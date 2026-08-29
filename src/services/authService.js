const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Business = require('../models/Business');
const AppError = require('../utils/AppError');
const env = require('../config/env');

/**
 * Generate a JWT for a user session
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      businessId: user.businessId,
      role: user.role,
      permissions: user.permissions
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN
    }
  );
};

const login = async (email, password) => {
  if (!email || !password) {
    throw new AppError('Please provide email and password', 400, 'BAD_REQUEST');
  }

  // Find user and explicitly select password field
  const user = await User.findOne({ email }).select('+password').populate('businessId');
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Verify user active status
  if (user.status !== 'ACTIVE') {
    throw new AppError(`Your account is ${user.status.toLowerCase()}`, 403, 'ACCOUNT_BLOCKED');
  }

  // If not Super Admin, verify business tenant is active
  if (user.role !== 'SUPER_ADMIN' && user.businessId) {
    if (!user.businessId.isActive) {
      throw new AppError('Your business account has been deactivated. Please contact support.', 403, 'BUSINESS_BLOCKED');
    }
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Generate session token
  const token = generateToken(user);

  // Strip password from returned user object
  const userObj = user.toObject();
  delete userObj.password;

  return {
    token,
    user: {
      _id: userObj._id,
      name: userObj.name,
      email: userObj.email,
      mobile: userObj.mobile,
      role: userObj.role,
      permissions: userObj.permissions,
      status: userObj.status,
      isFirstLogin: userObj.isFirstLogin,
      business: userObj.businessId
    }
  };
};

const forgotPassword = async (email) => {
  if (!email) {
    throw new AppError('Please provide an email address', 400, 'BAD_REQUEST');
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No user found with that email address', 404, 'USER_NOT_FOUND');
  }

  // Generate plain reset token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash reset token and set expiry
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  await user.save({ validateBeforeSave: false });

  // In development/test mode, we return the plain token so the user can easily reset password.
  // We can also print it to log.
  console.log(`[FORGOT PASSWORD RESET LINK]: ${env.CLIENT_URL}/reset-password?token=${resetToken}`);

  return resetToken;
};

const resetPassword = async (token, password) => {
  if (!token || !password) {
    throw new AppError('Invalid request. Token and password required.', 400, 'BAD_REQUEST');
  }

  // Hash the token to compare with the one in database
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with matching, valid reset token
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Token is invalid or has expired', 400, 'INVALID_RESET_TOKEN');
  }

  // Update password and clear reset fields
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.isFirstLogin = false; // reset implies login/setup action has begun

  await user.save();

  return true;
};

const getMe = async (userId) => {
  const user = await User.findById(userId).populate('businessId');
  if (!user) {
    throw new AppError('User session not found', 404, 'USER_NOT_FOUND');
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError('Account is no longer active', 403, 'UNAUTHORIZED');
  }

  const userObj = user.toObject();

  return {
    _id: userObj._id,
    name: userObj.name,
    email: userObj.email,
    mobile: userObj.mobile,
    role: userObj.role,
    permissions: userObj.permissions,
    status: userObj.status,
    isFirstLogin: userObj.isFirstLogin,
    business: userObj.businessId
  };
};

module.exports = {
  login,
  forgotPassword,
  resetPassword,
  getMe
};
