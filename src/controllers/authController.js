const authService = require('../services/authService');
const { logAction } = require('../services/auditService');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    // Record login audit log
    await logAction({
      businessId: result.user.business ? result.user.business._id : null,
      userId: result.user._id,
      action: 'LOGIN',
      module: 'AUTH',
      newData: { email }
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await logAction({
        businessId: req.user.businessId,
        userId: req.user.userId,
        action: 'LOGOUT',
        module: 'AUTH'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const resetToken = await authService.forgotPassword(email);

    res.status(200).json({
      success: true,
      message: 'Password reset instructions generated.',
      data: { resetToken } // Return plain token in development context for easy test validation
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await authService.getMe(req.user.userId);
    res.status(200).json({
      success: true,
      message: 'Profile fetched successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe
};
