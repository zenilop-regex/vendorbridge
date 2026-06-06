import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  module: {
    type: String,
    required: true,
    enum: ['RFQ', 'Vendor', 'PO', 'Invoice', 'Auth', 'Approval']
  },
  actorName: {
    type: String,
    required: true,
    trim: true
  },
  details: {
    type: String,
    trim: true
  }
});

const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
export default ActivityLog;
