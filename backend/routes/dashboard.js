import express from 'express';
import RFQ from '../models/RFQ.js';
import Quotation from '../models/Quotation.js';
import Approval from '../models/Approval.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Invoice from '../models/Invoice.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get dashboard summary statistics (role-based)
// @route   GET /api/dashboard/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  const { role, _id: userId } = req.user;

  try {
    const stats = {};

    // Get current date range for the month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    if (role === 'Procurement Officer' || role === 'Admin') {
      stats.activeRfqs = await RFQ.countDocuments({ status: 'Open' });
      stats.pendingApprovals = await Approval.countDocuments({ status: 'PENDING' });
      stats.posThisMonth = await PurchaseOrder.countDocuments({
        createdAt: { $gte: startOfMonth }
      });
      stats.invoicesSent = await Invoice.countDocuments({ status: 'Sent' });
    }

    if (role === 'Manager' || role === 'Admin') {
      stats.managerPendingApprovals = await Approval.countDocuments({ status: 'PENDING' });
      stats.approvedThisMonth = await Approval.countDocuments({
        status: 'APPROVED',
        updatedAt: { $gte: startOfMonth }
      });
      stats.rejectedThisMonth = await Approval.countDocuments({
        status: 'REJECTED',
        updatedAt: { $gte: startOfMonth }
      });

      // Total Spend Approved
      const approvedSpend = await Approval.aggregate([
        { $match: { status: 'APPROVED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      stats.totalSpendApproved = approvedSpend[0]?.total || 0;
    }

    if (role === 'Vendor' || role === 'Admin') {
      // Find Vendor record that corresponds to the company name or email of the user
      // For demo simplicity, we will query based on company name or if there is a vendor record.
      // We will look up a vendor record matching this user's email.
      // If we don't find it, we'll return 0 counts.
      const mongoose = await import('mongoose');
      const Vendor = mongoose.default.model('Vendor');
      const vendor = await Vendor.findOne({ email: req.user.email });

      if (vendor) {
        stats.openRfqsAssigned = await RFQ.countDocuments({
          assignedVendors: vendor._id,
          status: 'Open'
        });
        stats.quotationsSubmitted = await Quotation.countDocuments({
          vendorId: vendor._id
        });
        stats.posReceived = await PurchaseOrder.countDocuments({
          vendorId: vendor._id
        });
        stats.pendingInvoices = await Invoice.aggregate([
          {
            $lookup: {
              from: 'purchaseorders',
              localField: 'poId',
              foreignField: '_id',
              as: 'po'
            }
          },
          { $unwind: '$po' },
          {
            $match: {
              'po.vendorId': vendor._id,
              status: 'Draft'
            }
          },
          { $count: 'count' }
        ]);
        stats.pendingInvoicesCount = stats.pendingInvoices[0]?.count || 0;
        stats.vendorId = vendor._id;
      } else {
        stats.openRfqsAssigned = 0;
        stats.quotationsSubmitted = 0;
        stats.posReceived = 0;
        stats.pendingInvoicesCount = 0;
        stats.vendorId = null;
      }
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
