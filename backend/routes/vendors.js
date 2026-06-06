import express from 'express';
import Vendor from '../models/Vendor.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { logActivity } from '../middleware/loggerMiddleware.js';

const router = express.Router();

// @desc    Get all vendors with filters
// @route   GET /api/vendors
// @access  Private
router.get('/', protect, async (req, res) => {
  const { search, category, status } = req.query;
  let query = {};

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  if (category && category !== 'All') {
    query.category = category;
  }

  if (status && status !== 'All') {
    query.status = status;
  }

  try {
    const vendors = await Vendor.find(query).sort({ name: 1 });
    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single vendor by ID
// @route   GET /api/vendors/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create a new vendor
// @route   POST /api/vendors
// @access  Private (Admin / Procurement Officer)
router.post('/', protect, authorize('Admin', 'Procurement Officer'), async (req, res) => {
  const { name, contactPerson, email, phone, gst, category, city, status, notes } = req.body;

  try {
    // Check if GST already exists
    const gstExists = await Vendor.findOne({ gst });
    if (gstExists) {
      return res.status(400).json({ message: 'Vendor with this GST number already exists' });
    }

    // Check if Email already exists
    const emailExists = await Vendor.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Vendor with this email already exists' });
    }

    const vendor = new Vendor({
      name,
      contactPerson,
      email,
      phone,
      gst,
      category,
      city,
      status,
      notes
    });

    const savedVendor = await vendor.save();

    // Audit Log
    await logActivity(
      `Vendor registered: ${savedVendor.name}`,
      'Vendor',
      req.user.name,
      `Category: ${savedVendor.category}, GST: ${savedVendor.gst}`
    );

    res.status(201).json(savedVendor);
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update a vendor
// @route   PUT /api/vendors/:id
// @access  Private (Admin / Procurement Officer)
router.put('/:id', protect, authorize('Admin', 'Procurement Officer'), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const { name, contactPerson, email, phone, gst, category, city, status, notes } = req.body;

    vendor.name = name || vendor.name;
    vendor.contactPerson = contactPerson || vendor.contactPerson;
    vendor.email = email || vendor.email;
    vendor.phone = phone || vendor.phone;
    vendor.gst = gst || vendor.gst;
    vendor.category = category || vendor.category;
    vendor.city = city || vendor.city;
    vendor.status = status || vendor.status;
    vendor.notes = notes || vendor.notes;

    const updatedVendor = await vendor.save();

    // Audit Log
    await logActivity(
      `Vendor updated: ${updatedVendor.name}`,
      'Vendor',
      req.user.name,
      `Status changed to: ${updatedVendor.status}`
    );

    res.json(updatedVendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
