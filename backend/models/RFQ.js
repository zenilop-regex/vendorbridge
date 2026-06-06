import mongoose from 'mongoose';

const RFQItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  qty: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    required: true,
    trim: true
  }
});

const RFQSchema = new mongoose.Schema({
  rfqId: {
    type: String,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  deadline: {
    type: Date,
    required: true
  },
  lineItems: [RFQItemSchema],
  assignedVendors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  }],
  status: {
    type: String,
    required: true,
    enum: ['Draft', 'Open', 'Closed', 'Completed'],
    default: 'Draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Auto-generate rfqId sequentially: RFQ-YYYY-XXXX
RFQSchema.pre('save', async function (next) {
  if (!this.rfqId) {
    try {
      const year = new Date().getFullYear();
      const count = await this.constructor.countDocuments({
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lt: new Date(`${year + 1}-01-01`)
        }
      });
      const seq = String(count + 1).padStart(4, '0');
      this.rfqId = `RFQ-${year}-${seq}`;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

const RFQ = mongoose.model('RFQ', RFQSchema);
export default RFQ;
