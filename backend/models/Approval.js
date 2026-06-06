import mongoose from 'mongoose';

const ApprovalTimelineSchema = new mongoose.Schema({
  stepName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  actionBy: {
    type: String,
    required: true
  },
  actionDate: {
    type: Date,
    default: Date.now
  }
});

const ApprovalSchema = new mongoose.Schema({
  rfqId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFQ',
    required: true
  },
  quotationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  remarks: {
    type: String,
    trim: true
  },
  timeline: [ApprovalTimelineSchema]
}, {
  timestamps: true
});

const Approval = mongoose.model('Approval', ApprovalSchema);
export default Approval;
