const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Business = require('../models/Business');

const seedAllUserTypes = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/myerp';

  console.log('Connecting to database...');
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.\n');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }

  try {
    // 1. Ensure sample business exists for tenant users
    let business = await Business.findOne({ email: 'contact@alpharetailers.com' });
    if (!business) {
      business = await Business.findOne();
    }
    if (!business) {
      console.log('Creating sample business tenant (Alpha Retailers)...');
      business = await Business.create({
        name: 'Alpha Retailers',
        email: 'contact@alpharetailers.com',
        mobile: '9876500001',
        address: '102 Alpha Plaza, MG Road, Ahmedabad, Gujarat',
        state: 'Gujarat',
        pincode: '380001',
        gstNumber: '24AAAAB1111A1Z1',
        invoicePrefix: 'ALF',
        profileCompleted: true,
        isActive: true
      });
      console.log(`Business created: ${business.name} (${business._id})`);
    } else {
      console.log(`Using existing Business tenant: ${business.name} (${business._id})`);
    }

    // Define 1 user for each role type
    const seedUsersData = [
      {
        role: 'SUPER_ADMIN',
        businessId: null,
        name: 'Super Admin Operator',
        email: 'superadmin@yopmail.com',
        mobile: '9999999999',
        password: '123456',
        status: 'ACTIVE',
        isFirstLogin: false,
        permissions: ['*']
      },
      {
        role: 'OWNER',
        businessId: business._id,
        name: 'Rajesh Patel (Owner)',
        email: 'owner@yopmail.com',
        mobile: '9876543210',
        password: '123456',
        status: 'ACTIVE',
        isFirstLogin: false,
        permissions: ['*']
      },
      {
        role: 'MANAGER',
        businessId: business._id,
        name: 'Vikram Sharma (Manager)',
        email: 'manager@yopmail.com',
        mobile: '9876543211',
        password: '123456',
        status: 'ACTIVE',
        isFirstLogin: false,
        permissions: [
          'products.view', 'products.create', 'products.update', 'products.delete',
          'sales.view', 'sales.create', 'sales.return',
          'inventory.view', 'inventory.adjust',
          'customers.view', 'customers.create', 'customers.update',
          'suppliers.view', 'suppliers.create', 'suppliers.update',
          'purchases.view', 'purchases.create',
          'reports.view',
          'crm.view', 'crm.create', 'crm.update',
          'employees.view'
        ]
      },
      {
        role: 'EMPLOYEE',
        businessId: business._id,
        name: 'Ankit Mehta (Employee)',
        email: 'employee@yopmail.com',
        mobile: '9876543212',
        password: '123456',
        status: 'ACTIVE',
        isFirstLogin: false,
        permissions: [
          'products.view',
          'sales.view', 'sales.create',
          'customers.view', 'customers.create',
          'inventory.view'
        ]
      }
    ];

    console.log('\nSeeding/Updating user accounts for all role types...\n');

    const createdUsers = [];

    for (const userData of seedUsersData) {
      // Remove existing user if exists to re-hash password cleanly
      await User.deleteOne({ email: userData.email });

      const user = await User.create(userData);
      createdUsers.push({
        role: user.role,
        name: user.name,
        email: user.email,
        password: userData.password,
        mobile: user.mobile,
        business: user.role === 'SUPER_ADMIN' ? 'N/A (Global)' : business.name
      });

      console.log(`✓ Seeded ${user.role} user: ${user.email}`);
    }

    console.log('\n===================================================================================');
    console.log('                 USER ACCOUNTS SEEDED SUCCESSFULLY (ALL ROLE TYPES)                ');
    console.log('===================================================================================');
    console.table(createdUsers);
    console.log('===================================================================================');
    console.log('Note: Password for all seeded users is: Password123!');
    console.log('You can now log in with any of the email addresses above using password: Password123!\n');

  } catch (error) {
    console.error('User seeding failed with error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

seedAllUserTypes();
