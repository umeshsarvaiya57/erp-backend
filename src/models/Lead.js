const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Lead contact name is required'],
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Lead contact mobile is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    source: {
      type: String,
      enum: ['COLD_CALL', 'WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'WALK_IN'],
      default: 'COLD_CALL',
    },
    status: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'CONVERTED'],
      default: 'NEW',
      index: true,
    },
    value: {
      type: Number,
      default: 0,
      min: [0, 'Lead value cannot be negative'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

LeadSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.model('Lead', LeadSchema);
