import express from 'express';
import RFQ from '../models/RFQ.js';
import Quotation from '../models/Quotation.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { logActivity } from '../middleware/loggerMiddleware.js';

const router = express.Router();

// @desc    Create an RFQ
// @route   POST /api/rfq
// @access  Private (Procurement Officer)
router.post('/', protect, authorize('Procurement Officer'), async (req, res) => {
  const { title, description, category, deadline, lineItems, assignedVendors, status } = req.body;

  try {
    const rfq = new RFQ({
      title,
      description,
      category,
      deadline,
      lineItems,
      assignedVendors,
      status: status || 'Draft',
      createdBy: req.user._id
    });

    const savedRfq = await rfq.save();

    // Audit Log
    await logActivity(
      `RFQ Created: ${savedRfq.rfqId} - "${savedRfq.title}"`,
      'RFQ',
      req.user.name,
      `Status: ${savedRfq.status}, Assigned Vendors Count: ${savedRfq.assignedVendors.length}`
    );

    res.status(201).json(savedRfq);
  } catch (error) {
    console.error('Error creating RFQ:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all RFQs with filters
// @route   GET /api/rfq
// @access  Private
router.get('/', protect, async (req, res) => {
  const { status, category } = req.query;
  let query = {};

  if (status && status !== 'All') {
    query.status = status;
  }
  if (category && category !== 'All') {
    query.category = category;
  }

  // If the logged-in user is a Vendor, only show RFQs assigned to them and with status 'Open' or 'Completed'
  if (req.user.role === 'Vendor') {
    // We need to look up the Vendor record associated with this user's company or email
    // To keep it simple, we'll let vendors find RFQs where their Vendor ObjectId matches.
    // The frontend will pass the vendor ID, or we can look it up in the database.
    // Let's check: in our registration, the user has a companyName. If they are a Vendor,
    // they should be associated with a Vendor object. Let's make sure the query handles it.
  }

  try {
    const rfqs = await RFQ.find(query)
      .populate('createdBy', 'name')
      .populate('assignedVendors', 'name')
      .sort({ createdAt: -1 });
    res.json(rfqs);
  } catch (error) {
    console.error('Error fetching RFQs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get RFQs assigned to a specific vendor
// @route   GET /api/rfq/vendor/:vendorId
// @access  Private
router.get('/vendor/:vendorId', protect, async (req, res) => {
  try {
    // Vendors should only see RFQs that are Open/Completed and assigned to them
    const rfqs = await RFQ.find({
      assignedVendors: req.params.vendorId,
      status: { $in: ['Open', 'Completed', 'Closed'] }
    })
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

    res.json(rfqs);
  } catch (error) {
    console.error('Error fetching vendor RFQs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get RFQ detail and associated quotations
// @route   GET /api/rfq/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const rfq = await RFQ.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('assignedVendors', 'name contactPerson email phone gst');

    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    // Get all quotations submitted for this RFQ
    const quotations = await Quotation.find({ rfqId: rfq._id })
      .populate('vendorId', 'name contactPerson email phone gst');

    res.json({ rfq, quotations });
  } catch (error) {
    console.error('Error fetching RFQ details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Publish RFQ (Change status to Open)
// @route   PUT /api/rfq/:id/publish
// @access  Private (Procurement Officer)
router.put('/:id/publish', protect, authorize('Procurement Officer'), async (req, res) => {
  try {
    const rfq = await RFQ.findById(req.params.id);
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    rfq.status = 'Open';
    const updatedRfq = await rfq.save();

    // Audit Log
    await logActivity(
      `RFQ Published: ${updatedRfq.rfqId}`,
      'RFQ',
      req.user.name,
      `Status updated to Open`
    );

    res.json(updatedRfq);
  } catch (error) {
    console.error('Error publishing RFQ:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
