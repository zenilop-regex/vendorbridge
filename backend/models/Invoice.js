import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true
  },
  poId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  cgst: {
    type: Number,
    required: true,
    min: 0
  },
  sgst: {
    type: Number,
    required: true,
    min: 0
  },
  grandTotal: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['Draft', 'Sent', 'Paid'],
    default: 'Draft'
  }
}, {
  timestamps: true
});

// Auto-generate invoiceNumber sequentially: INV-YYYY-XXXX
InvoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    try {
      const year = new Date().getFullYear();
      const count = await this.constructor.countDocuments({
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lt: new Date(`${year + 1}-01-01`)
        }
      });
      const seq = String(count + 1).padStart(4, '0');
      this.invoiceNumber = `INV-${year}-${seq}`;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

const Invoice = mongoose.model('Invoice', InvoiceSchema);
export default Invoice;
