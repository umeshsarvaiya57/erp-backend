const employeeService = require('../services/employeeService');
const { logAction } = require('../services/auditService');

const createEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.createEmployee(req.businessId, req.body);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'ADD_EMPLOYEE',
      module: 'TEAM',
      entityId: employee._id,
      newData: { name: employee.name, email: employee.email, role: employee.role }
    });

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      data: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        isActive: employee.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Prevent updating oneself role or status to lock security ownership
    if (id === req.user.userId.toString() && (req.body.role || req.body.isActive !== undefined)) {
      return res.status(400).json({
        success: false,
        message: 'Security protection: You cannot change your own role or account status.'
      });
    }

    const employee = await employeeService.updateEmployee(req.businessId, id, req.body);

    await logAction({
      businessId: req.businessId,
      userId: req.user.userId,
      action: 'UPDATE_EMPLOYEE_ROLES',
      module: 'TEAM',
      entityId: id,
      newData: { name: employee.name, email: employee.email, role: employee.role, isActive: employee.isActive }
    });

    res.status(200).json({
      success: true,
      message: 'Employee settings updated successfully',
      data: employee
    });
  } catch (error) {
    next(error);
  }
};

const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await employeeService.getAllEmployees(req.businessId);
    res.status(200).json({
      success: true,
      message: 'Employee list fetched successfully',
      data: employees
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEmployee,
  updateEmployee,
  getAllEmployees
};
