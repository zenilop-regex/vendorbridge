import express from 'express';
import Quotation from '../models/Quotation.js';
import RFQ from '../models/RFQ.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { logActivity } from '../middleware/loggerMiddleware.js';

const router = express.Router();

// @desc    Submit a new quotation
// @route   POST /api/quotations
// @access  Private (Vendor)
router.post('/', protect, authorize('Vendor'), async (req, res) => {
  const { rfqId, vendorId, lineItems, gstPercent, paymentTerms, deliveryTimeline, notes, validityDate } = req.body;

  try {
    // Check if RFQ exists
    const rfq = await RFQ.findById(rfqId);
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    // Check if deadline has passed
    if (new Date() > new Date(rfq.deadline)) {
      return res.status(400).json({ message: 'Submission deadline has passed for this RFQ' });
    }

    // Check if vendor already submitted a quotation
    const existingQuotation = await Quotation.findOne({ rfqId, vendorId });
    if (existingQuotation) {
      return res.status(400).json({ message: 'You have already submitted a quotation for this RFQ' });
    }

    const quotation = new Quotation({
      rfqId,
      vendorId,
      lineItems,
      gstPercent: gstPercent || 18,
      paymentTerms,
      deliveryTimeline,
      notes,
      validityDate,
      status: 'submitted'
    });

    const savedQuotation = await quotation.save();

    // Populate vendor info for the log
    const populatedQuote = await savedQuotation.populate('vendorId', 'name');

    // Audit Log
    await logActivity(
      `Quotation Submitted for RFQ: ${rfq.rfqId}`,
      'RFQ',
      req.user.name,
      `Vendor: ${populatedQuote.vendorId.name}, Items Count: ${lineItems.length}`
    );

    res.status(201).json(savedQuotation);
  } catch (error) {
    console.error('Error submitting quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Edit a quotation
// @route   PUT /api/quotations/:id
// @access  Private (Vendor)
router.put('/:id', protect, authorize('Vendor'), async (req, res) => {
  const { lineItems, gstPercent, paymentTerms, deliveryTimeline, notes, validityDate } = req.body;

  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Check if RFQ deadline has passed
    const rfq = await RFQ.findById(quotation.rfqId);
    if (rfq && new Date() > new Date(rfq.deadline)) {
      return res.status(400).json({ message: 'Submission deadline has passed. Cannot edit quotation.' });
    }

    // Only allow editing if quotation status is not already selected or rejected (locked in workflow)
    if (quotation.status !== 'submitted') {
      return res.status(400).json({ message: 'Quotation is locked in approval workflow and cannot be modified' });
    }

    quotation.lineItems = lineItems || quotation.lineItems;
    quotation.gstPercent = gstPercent || quotation.gstPercent;
    quotation.paymentTerms = paymentTerms || quotation.paymentTerms;
    quotation.deliveryTimeline = deliveryTimeline || quotation.deliveryTimeline;
    quotation.notes = notes || quotation.notes;
    quotation.validityDate = validityDate || quotation.validityDate;

    const updatedQuotation = await quotation.save();
    const populatedQuote = await updatedQuotation.populate('vendorId', 'name');

    // Audit Log
    await logActivity(
      `Quotation Updated for RFQ: ${rfq.rfqId}`,
      'RFQ',
      req.user.name,
      `Vendor: ${populatedQuote.vendorId.name}`
    );

    res.json(updatedQuotation);
  } catch (error) {
    console.error('Error editing quotation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all quotations for an RFQ (For comparison)
// @route   GET /api/quotations/rfq/:rfqId
// @access  Private
router.get('/rfq/:rfqId', protect, async (req, res) => {
  try {
    const quotations = await Quotation.find({ rfqId: req.params.rfqId })
      .populate('vendorId', 'name category contactPerson email phone gst rating')
      .sort({ createdAt: 1 });
    res.json(quotations);
  } catch (error) {
    console.error('Error fetching quotations for RFQ:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get vendor's own quotations
// @route   GET /api/quotations/vendor/:vendorId
// @access  Private
router.get('/vendor/:vendorId', protect, async (req, res) => {
  try {
    const quotations = await Quotation.find({ vendorId: req.params.vendorId })
      .populate('rfqId', 'rfqId title category deadline status')
      .sort({ createdAt: -1 });
    res.json(quotations);
  } catch (error) {
    console.error('Error fetching vendor quotations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
