const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Supplier mobile number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      trim: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0, // amount we owe to this supplier
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

// Unique mobile per business tenant
SupplierSchema.index({ businessId: 1, mobile: 1 }, { unique: true });
SupplierSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.model('Supplier', SupplierSchema);
