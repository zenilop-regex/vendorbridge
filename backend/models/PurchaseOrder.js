import mongoose from 'mongoose';

const POItemSchema = new mongoose.Schema({
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
  }
});

const PurchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    unique: true
  },
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
  lineItems: [POItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryAddress: {
    type: String,
    required: true,
    trim: true
  },
  paymentTerms: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'sent', 'acknowledged'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Auto-generate poNumber sequentially: PO-YYYY-XXXX
PurchaseOrderSchema.pre('save', async function (next) {
  if (!this.poNumber) {
    try {
      const year = new Date().getFullYear();
      const count = await this.constructor.countDocuments({
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lt: new Date(`${year + 1}-01-01`)
        }
      });
      const seq = String(count + 1).padStart(4, '0');
      this.poNumber = `PO-${year}-${seq}`;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

const PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
export default PurchaseOrder;
