const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');

// Load environment configurations
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Business = require('../models/Business');
const User = require('../models/User');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const InventoryTransaction = require('../models/InventoryTransaction');
const Activity = require('../models/Activity');
const AuditLog = require('../models/AuditLog');

const runSeed = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Error: MONGO_URI environment variable is missing.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log('Database connected successfully.');

  try {
    // 1. Drop existing data to secure a clean slate
    console.log('Cleaning existing database collections...');
    await Business.deleteMany({});
    await User.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await Product.deleteMany({});
    await Customer.deleteMany({});
    await Supplier.deleteMany({});
    await InventoryTransaction.deleteMany({});
    await Activity.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('Database cleared.');

    // 2. Create Super Admin account
    console.log('Creating Super Admin account...');
    const superAdmin = await User.create({
      name: 'Super Admin Operator',
      email: 'superadmin@myerp.com',
      mobile: '9999999999',
      password: 'Password123!',
      role: 'SUPER_ADMIN',
      profileCompleted: true
    });
    console.log(`Super Admin created: ${superAdmin.email}`);

    // 3. Create Sample Tenant Business
    console.log('Creating sample tenant Business...');
    const business = await Business.create({
      name: 'Alpha Retailers',
      email: 'contact@alpharetailers.com',
      mobile: '9876500001',
      address: '102 Alpha Plaza, MG Road, Ahmedabad, Gujarat',
      state: 'Gujarat',
      pincode: '380001',
      gstNumber: '24AAAAB1111A1Z1',
      invoicePrefix: 'ALF',
      profileCompleted: true
    });
    console.log(`Business Tenant created: ${business.name} (${business._id})`);

    // 4. Create Business Owner account
    console.log('Creating Business Owner account...');
    const owner = await User.create({
      businessId: business._id,
      name: 'Rajesh Patel',
      email: 'owner@alpharetailers.com',
      mobile: '9876543210',
      password: 'Password123!',
      role: 'OWNER',
      profileCompleted: true
    });
    console.log(`Business Owner created: ${owner.email}`);

    // 5. Create Categories
    console.log('Seeding Categories...');
    const electronicsCat = await Category.create({
      businessId: business._id,
      name: 'Smartphones',
      description: 'Mobile phones and communication accessories'
    });
    const appliancesCat = await Category.create({
      businessId: business._id,
      name: 'Home Appliances',
      description: 'Kitchen and living space electronics'
    });

    // 6. Create Brands
    console.log('Seeding Brands...');
    const samsungBrand = await Brand.create({
      businessId: business._id,
      name: 'Samsung',
      description: 'Samsung Electronic Devices'
    });
    const lgBrand = await Brand.create({
      businessId: business._id,
      name: 'LG',
      description: 'LG Life\'s Good Appliances'
    });

    // 7. Create Products (with opening quantities logging)
    console.log('Seeding Products...');
    const s23 = await Product.create({
      businessId: business._id,
      name: 'Samsung Galaxy S23 Ultra',
      sku: 'SAM-S23U-256G',
      barcode: '8806094762112',
      categoryId: electronicsCat._id,
      brandId: samsungBrand._id,
      unit: 'PCS',
      purchasePrice: 95000,
      sellingPrice: 110000,
      mrp: 124999,
      gstRate: 18,
      quantity: 12,
      minimumStock: 3,
      description: 'Samsung flagship smartphone with S-Pen, 256GB storage.',
      createdBy: owner._id
    });

    await InventoryTransaction.create({
      businessId: business._id,
      productId: s23._id,
      type: 'OPENING',
      quantity: 12,
      previousQuantity: 0,
      newQuantity: 12,
      reason: 'Opening stock registration',
      createdBy: owner._id
    });

    const lgTv = await Product.create({
      businessId: business._id,
      name: 'LG 55" OLED Smart TV',
      sku: 'LG-OLED55-C3',
      barcode: '8806091212345',
      categoryId: appliancesCat._id,
      brandId: lgBrand._id,
      unit: 'PCS',
      purchasePrice: 110000,
      sellingPrice: 135000,
      mrp: 145000,
      gstRate: 28,
      quantity: 5,
      minimumStock: 2,
      description: 'LG C3 Series 55-inch OLED 4K Smart Television.',
      createdBy: owner._id
    });

    await InventoryTransaction.create({
      businessId: business._id,
      productId: lgTv._id,
      type: 'OPENING',
      quantity: 5,
      previousQuantity: 0,
      newQuantity: 5,
      reason: 'Opening stock registration',
      createdBy: owner._id
    });

    // 8. Create Customer (Local State for CGST/SGST verification)
    console.log('Seeding Customer (Local GST)...');
    const localCust = await Customer.create({
      businessId: business._id,
      name: 'Harsh Shah',
      mobile: '9825098250',
      email: 'harsh@shahmail.com',
      address: '402 Satellite Enclave, Satellite Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
      openingBalance: 0,
      balance: 0
    });

    // 9. Create Supplier (Interstate State for IGST verification)
    console.log('Seeding Supplier (Interstate GST)...');
    const interSupplier = await Supplier.create({
      businessId: business._id,
      name: 'Mumbai Electronic Distributers',
      companyName: 'MED Ltd',
      mobile: '9004090040',
      email: 'orders@medmumbai.com',
      address: 'Building 14, Lamington Road',
      state: 'Maharashtra',
      gstNumber: '27AAAAM4444A1Z4',
      openingBalance: 0,
      balance: 0
    });

    // 10. Record activities logs
    await Activity.create({
      businessId: business._id,
      type: 'LEAD_CREATED',
      description: 'Sample data seeding completed successfully.',
      createdBy: owner._id
    });

    console.log('\n======================================================');
    console.log('   DATABASE SEED COMPLETED SUCCESSFULLY!  ');
    console.log('======================================================');
    console.log(`- Super Admin Login: superadmin@myerp.com / Password123!`);
    console.log(`- Business Owner Login: owner@alpharetailers.com / Password123!`);
    console.log(`- Tenant: ${business.name} (GST State: ${business.state})`);
    console.log(`- Products: ${s23.name} (${s23.sku}), ${lgTv.name} (${lgTv.sku})`);
    console.log(`- Customers: ${localCust.name} (State: ${localCust.state})`);
    console.log(`- Suppliers: ${interSupplier.name} (State: ${interSupplier.state})`);
    console.log('======================================================\n');

  } catch (error) {
    console.error('Seed process failed with error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

runSeed();
