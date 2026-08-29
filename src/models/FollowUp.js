const mongoose = require('mongoose');

const FollowUpSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead link is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['CALL', 'EMAIL', 'MEETING', 'OTHER'],
      default: 'CALL',
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date and time are required'],
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

FollowUpSchema.index({ businessId: 1, scheduledDate: 1 });

module.exports = mongoose.model('FollowUp', FollowUpSchema);
