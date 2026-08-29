const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null, // Null for global Super Admin actions
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
    },
    module: {
      type: String,
      required: [true, 'Module is required'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    oldData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // only log created at
  }
);

// Index to support common queries
AuditLogSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
