const whatsappGatewayService = require('../services/whatsappGatewayService');

const getStatus = async (req, res, next) => {
  try {
    const status = whatsappGatewayService.getStatus();
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

const initialize = async (req, res, next) => {
  try {
    const status = await whatsappGatewayService.initialize();
    res.status(200).json({
      success: true,
      message: 'WhatsApp Gateway initialized',
      data: status
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const status = await whatsappGatewayService.logout();
    res.status(200).json({
      success: true,
      message: 'Logged out from WhatsApp Gateway',
      data: status
    });
  } catch (error) {
    next(error);
  }
};

const toggleAutoSend = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    const status = whatsappGatewayService.setAutoSendEnabled(enabled);
    res.status(200).json({
      success: true,
      message: `Automatic WhatsApp bill sending is now ${status.autoSendEnabled ? 'enabled' : 'disabled'}`,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

const sendTestMessage = async (req, res, next) => {
  try {
    const { phone, message } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const testMsg = message || '👋 Hello! This is a test message from your MyERP Billing WhatsApp Gateway. Your automated messaging is working perfectly! 🎉';
    await whatsappGatewayService.sendTextMessage(phone, testMsg);

    res.status(200).json({
      success: true,
      message: `Test WhatsApp message sent successfully to ${phone}!`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStatus,
  initialize,
  logout,
  toggleAutoSend,
  sendTestMessage
};
