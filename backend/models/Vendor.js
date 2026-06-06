import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  contactPerson: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  gst: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['IT', 'Logistics', 'Manufacturing', 'Services', 'Raw Materials']
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Inactive', 'Blacklisted'],
    default: 'Active'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

const Vendor = mongoose.model('Vendor', VendorSchema);
export default Vendor;
