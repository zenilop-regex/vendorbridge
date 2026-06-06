import express from 'express';
import Approval from '../models/Approval.js';
import RFQ from '../models/RFQ.js';
import Quotation from '../models/Quotation.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { logActivity } from '../middleware/loggerMiddleware.js';

const router = express.Router();

// @desc    Create an approval request
// @route   POST /api/approvals
// @access  Private (Procurement Officer)
router.post('/', protect, authorize('Procurement Officer'), async (req, res) => {
  const { rfqId, quotationId, vendorId, amount } = req.body;

  try {
    // Check if RFQ and Quotation exist
    const rfq = await RFQ.findById(rfqId);
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    const quotation = await Quotation.findById(quotationId).populate('vendorId', 'name');
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Check if there is an active/pending approval already
    const existingApproval = await Approval.findOne({ rfqId, status: 'PENDING' });
    if (existingApproval) {
      return res.status(400).json({ message: 'An approval request is already pending for this RFQ' });
    }

    const approval = new Approval({
      rfqId,
      quotationId,
      vendorId,
      requestedBy: req.user._id,
      amount,
      status: 'PENDING',
      timeline: [
        { stepName: 'Created', status: 'done', actionBy: req.user.name, actionDate: new Date() },
        { stepName: 'Submitted for Approval', status: 'active', actionBy: req.user.name, actionDate: new Date() }
      ]
    });

    const savedApproval = await approval.save();

    // Audit Log
    await logActivity(
      `Approval Request Created for RFQ: ${rfq.rfqId}`,
      'Approval',
      req.user.name,
      `Selected Vendor: ${quotation.vendorId.name}, Amount: INR ${amount}`
    );

    res.status(201).json(savedApproval);
  } catch (error) {
    console.error('Error creating approval request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all approvals with status filter (role-based)
// @route   GET /api/approvals
// @access  Private
router.get('/', protect, async (req, res) => {
  const { status } = req.query;
  let query = {};

  if (status && status !== 'All') {
    query.status = status;
  }

  // If Manager, they see all approvals. If Procurement Officer, they can see their own requested approvals.
  if (req.user.role === 'Procurement Officer') {
    query.requestedBy = req.user._id;
  }

  try {
    const approvals = await Approval.find(query)
      .populate('rfqId', 'rfqId title category deadline')
      .populate('vendorId', 'name category rating')
      .populate('quotationId', 'paymentTerms deliveryTimeline')
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(approvals);
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single approval details
// @route   GET /api/approvals/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const approval = await Approval.findById(req.params.id)
      .populate('rfqId', 'rfqId title category description deadline lineItems')
      .populate('vendorId', 'name contactPerson email phone gst city category rating')
      .populate('quotationId')
      .populate('requestedBy', 'name email');

    if (!approval) {
      return res.status(404).json({ message: 'Approval request not found' });
    }

    res.json(approval);
  } catch (error) {
    console.error('Error fetching approval details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Approve a request
// @route   PUT /api/approvals/:id/approve
// @access  Private (Manager)
router.put('/:id/approve', protect, authorize('Manager'), async (req, res) => {
  const { remarks } = req.body;

  try {
    const approval = await Approval.findById(req.params.id);
    if (!approval) {
      return res.status(404).json({ message: 'Approval request not found' });
    }

    if (approval.status !== 'PENDING') {
      return res.status(400).json({ message: 'Approval request has already been processed' });
    }

    // Update approval status
    approval.status = 'APPROVED';
    approval.remarks = remarks || approval.remarks;
    
    // Add to timeline
    approval.timeline.push({
      stepName: 'Approved',
      status: 'done',
      actionBy: req.user.name,
      actionDate: new Date()
    });

    const savedApproval = await approval.save();

    // Update selected quotation status to 'selected'
    await Quotation.findByIdAndUpdate(approval.quotationId, { status: 'selected' });
    // Update other quotations for the same RFQ to 'rejected'
    await Quotation.updateMany(
      { rfqId: approval.rfqId, _id: { $ne: approval.quotationId } },
      { status: 'rejected' }
    );

    // Update RFQ status to Closed (since vendor is selected and approved)
    const rfq = await RFQ.findById(approval.rfqId);
    if (rfq) {
      rfq.status = 'Closed';
      await rfq.save();
    }

    // Audit Log
    await logActivity(
      `Approval Request APPROVED for RFQ: ${rfq ? rfq.rfqId : 'N/A'}`,
      'Approval',
      req.user.name,
      `Remarks: ${remarks || 'None'}`
    );

    res.json(savedApproval);
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Reject a request
// @route   PUT /api/approvals/:id/reject
// @access  Private (Manager)
router.put('/:id/reject', protect, authorize('Manager'), async (req, res) => {
  const { remarks } = req.body;

  // Remarks are required for rejection
  if (!remarks) {
    return res.status(400).json({ message: 'Remarks are required for rejection' });
  }

  try {
    const approval = await Approval.findById(req.params.id);
    if (!approval) {
      return res.status(404).json({ message: 'Approval request not found' });
    }

    if (approval.status !== 'PENDING') {
      return res.status(400).json({ message: 'Approval request has already been processed' });
    }

    // Update approval status
    approval.status = 'REJECTED';
    approval.remarks = remarks;

    // Add to timeline
    approval.timeline.push({
      stepName: 'Rejected',
      status: 'done',
      actionBy: req.user.name,
      actionDate: new Date()
    });

    const savedApproval = await approval.save();

    // Reset selected quotation status to 'submitted' so it can be selected again or re-evaluated
    await Quotation.findByIdAndUpdate(approval.quotationId, { status: 'submitted' });

    const rfq = await RFQ.findById(approval.rfqId);

    // Audit Log
    await logActivity(
      `Approval Request REJECTED for RFQ: ${rfq ? rfq.rfqId : 'N/A'}`,
      'Approval',
      req.user.name,
      `Reason for Rejection: ${remarks}`
    );

    res.json(savedApproval);
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
