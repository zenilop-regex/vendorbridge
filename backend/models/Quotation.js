import mongoose from 'mongoose';

const QuotationItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  qty: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryDays: {
    type: Number,
    required: true,
    min: 1
  }
});

const QuotationSchema = new mongoose.Schema({
  rfqId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RFQ',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  lineItems: [QuotationItemSchema],
  gstPercent: {
    type: Number,
    default: 18
  },
  paymentTerms: {
    type: String,
    required: true,
    trim: true
  },
  deliveryTimeline: {
    type: String,
    required: true,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  validityDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['submitted', 'selected', 'rejected'],
    default: 'submitted'
  }
}, {
  timestamps: true
});

const Quotation = mongoose.model('Quotation', QuotationSchema);
export default Quotation;
