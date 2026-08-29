const User = require('../models/User');
const AppError = require('../utils/AppError');

const createEmployee = async (businessId, employeeData) => {
  const { name, email, mobile, password, role } = employeeData;

  if (!name || !email || !mobile || !password || !role) {
    throw new AppError('Name, email, mobile, password, and role are required fields.', 400, 'BAD_REQUEST');
  }

  // Ensure unique email
  const emailExists = await User.findOne({ email: email.toLowerCase() });
  if (emailExists) {
    throw new AppError(`A user account with email "${email}" already exists.`, 400, 'DUPLICATE_EMAIL');
  }

  // Ensure unique mobile
  const mobileExists = await User.findOne({ mobile });
  if (mobileExists) {
    throw new AppError(`A user account with mobile "${mobile}" already exists.`, 400, 'DUPLICATE_MOBILE');
  }

  const employee = await User.create({
    businessId,
    name,
    email: email.toLowerCase(),
    mobile,
    password,
    role,
    profileCompleted: true // Employees skip the business profile completed wizard
  });

  return employee;
};

const updateEmployee = async (businessId, employeeId, data) => {
  // Prevent shifting self to non-owner or disabling self
  delete data.businessId;

  if (data.email) {
    const exists = await User.findOne({ email: data.email.toLowerCase(), _id: { $ne: employeeId } });
    if (exists) {
      throw new AppError(`A user account with email "${data.email}" already exists.`, 400, 'DUPLICATE_EMAIL');
    }
  }

  const employee = await User.findOneAndUpdate(
    { _id: employeeId, businessId },
    { $set: data },
    { new: true, runValidators: true }
  ).select('-password');

  if (!employee) {
    throw new AppError('Employee not found.', 404, 'EMPLOYEE_NOT_FOUND');
  }

  return employee;
};

const getAllEmployees = async (businessId) => {
  return await User.find({ businessId })
    .select('-password')
    .sort({ createdAt: 1 });
};

module.exports = {
  createEmployee,
  updateEmployee,
  getAllEmployees
};
