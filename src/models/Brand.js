const mongoose = require('mongoose');

const BrandSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure brands are unique within each business tenant
BrandSchema.index({ businessId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Brand', BrandSchema);
