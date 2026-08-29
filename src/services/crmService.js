const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Activity = require('../models/Activity');
const AppError = require('../utils/AppError');

const createLead = async (businessId, userId, data) => {
  const { name, companyName, mobile, email, source, value, notes, assignedTo } = data;

  if (!name || !mobile) {
    throw new AppError('Lead contact name and mobile number are required.', 400, 'BAD_REQUEST');
  }

  const lead = await Lead.create({
    businessId,
    name,
    companyName,
    mobile,
    email,
    source: source || 'COLD_CALL',
    status: 'NEW',
    value: value || 0,
    assignedTo: assignedTo || null,
    notes,
  });

  // Log activity
  await Activity.create({
    businessId,
    type: 'LEAD_CREATED',
    description: `New lead "${name}" was registered. Source: ${lead.source}`,
    referenceId: lead._id,
    referenceModel: 'Lead',
    createdBy: userId
  });

  return lead;
};

const updateLead = async (businessId, leadId, userId, data) => {
  delete data.businessId;

  const oldLead = await Lead.findOne({ _id: leadId, businessId });
  if (!oldLead) {
    throw new AppError('Lead not found in database.', 404, 'LEAD_NOT_FOUND');
  }

  const lead = await Lead.findOneAndUpdate(
    { _id: leadId, businessId },
    { $set: data },
    { new: true, runValidators: true }
  );

  // If status changed, record timeline activity
  if (data.status && data.status !== oldLead.status) {
    await Activity.create({
      businessId,
      type: 'LEAD_STATUS_CHANGE',
      description: `Lead "${lead.name}" status was updated from ${oldLead.status} to ${lead.status}`,
      referenceId: lead._id,
      referenceModel: 'Lead',
      createdBy: userId
    });
  }

  return lead;
};

const getAllLeads = async (businessId, { page = 1, limit = 20, search = '', status }) => {
  const query = { businessId };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } }
    ];
  }

  if (status) {
    query.status = status;
  }

  const total = await Lead.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const data = await Lead.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('assignedTo', 'name');

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
};

const createFollowUp = async (businessId, userId, data) => {
  const { leadId, type, scheduledDate, notes } = data;

  if (!leadId || !scheduledDate) {
    throw new AppError('Lead ID and scheduled date are required.', 400, 'BAD_REQUEST');
  }

  const lead = await Lead.findOne({ _id: leadId, businessId });
  if (!lead) {
    throw new AppError('Lead not found.', 404, 'LEAD_NOT_FOUND');
  }

  const followup = await FollowUp.create({
    businessId,
    leadId,
    type: type || 'CALL',
    scheduledDate,
    notes,
    status: 'SCHEDULED',
    createdBy: userId
  });

  // Log activity
  await Activity.create({
    businessId,
    type: 'LEAD_FOLLOWUP',
    description: `Scheduled a new followup ${type} for lead "${lead.name}" on ${new Date(scheduledDate).toLocaleString()}`,
    referenceId: lead._id,
    referenceModel: 'Lead',
    createdBy: userId
  });

  return followup;
};

const getFollowUpsForLead = async (businessId, leadId) => {
  return await FollowUp.find({ businessId, leadId }).sort({ scheduledDate: 1 });
};

const getActivitiesTimeline = async (businessId, { page = 1, limit = 20 } = {}) => {
  const query = { businessId };
  const total = await Activity.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const data = await Activity.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'name');

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
};

module.exports = {
  createLead,
  updateLead,
  getAllLeads,
  createFollowUp,
  getFollowUpsForLead,
  getActivitiesTimeline
};
