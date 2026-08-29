const AuditLog = require('../models/AuditLog');

/**
 * Record a security or system operation in the audit trail.
 * Sanitizes sensitive inputs automatically.
 */
const logAction = async ({
  businessId,
  userId,
  action,
  module,
  entityId = null,
  oldData = null,
  newData = null
}) => {
  try {
    // Sanitize passwords to prevent leaking secrets in audits
    const sanitize = (data) => {
      if (!data || typeof data !== 'object') return data;
      const copy = JSON.parse(JSON.stringify(data)); // deep clone
      if (copy.password) delete copy.password;
      if (copy.token) delete copy.token;
      return copy;
    };

    await AuditLog.create({
      businessId: businessId || null,
      userId,
      action,
      module,
      entityId,
      oldData: sanitize(oldData),
      newData: sanitize(newData),
    });
  } catch (error) {
    console.error('[Audit Log Error]: Failed to write log:', error.message);
  }
};

module.exports = {
  logAction,
};
