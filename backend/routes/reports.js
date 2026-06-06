import express from 'express';
import PurchaseOrder from '../models/PurchaseOrder.js';
import RFQ from '../models/RFQ.js';
import Quotation from '../models/Quotation.js';
import Vendor from '../models/Vendor.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper: Filter builder based on query parameters (date range & category)
const buildFilterQuery = (req) => {
  const { fromDate, toDate, category } = req.query;
  let query = {};

  if (category && category !== 'All') {
    query.category = category;
  }

  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) {
      query.createdAt.$gte = new Date(fromDate);
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23,59,59,999);
      query.createdAt.$lte = end;
    }
  }

  return query;
};

// @desc    Get monthly spend for last 6 months
// @route   GET /api/reports/spend
// @access  Private
router.get('/spend', protect, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0,0,0,0);

    // Filter by date and category
    const { category } = req.query;
    let matchStage = {
      createdAt: { $gte: sixMonthsAgo },
      status: { $in: ['sent', 'acknowledged'] } // POs that are active
    };

    if (category && category !== 'All') {
      // Look up RFQ category by matching RFQ details
      // We will perform a lookup to RFQ inside the aggregation
    }

    const spendData = await PurchaseOrder.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalSpend: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format for charts (e.g. "Jan", "Feb")
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Build list of last 6 months
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const label = `${monthsName[month - 1]} ${year}`;

      const match = spendData.find(s => s._id.year === year && s._id.month === month);
      result.push({
        month: label,
        spend: match ? match.totalSpend : 0
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Spend Report Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get vendor performance metrics
// @route   GET /api/reports/vendors
// @access  Private
router.get('/vendors', protect, async (req, res) => {
  try {
    const vendors = await Vendor.find();
    const performance = [];

    for (const vendor of vendors) {
      // invited RFQs
      const invitedCount = await RFQ.countDocuments({ assignedVendors: vendor._id });
      // submitted Quotes
      const submittedCount = await Quotation.countDocuments({ vendorId: vendor._id });
      // awarded POs
      const awardedCount = await PurchaseOrder.countDocuments({ vendorId: vendor._id });

      // Avg delivery days from submitted/selected quotes
      const quotes = await Quotation.find({ vendorId: vendor._id, status: 'selected' });
      const avgDelivery = quotes.length > 0
        ? quotes.reduce((acc, q) => acc + q.deliveryTimeline.replace(/\D/g, '') * 1 || 5, 0) / quotes.length
        : 0;

      // Simulated on-time percentage (e.g. based on ratings, default to 95% if no rating)
      const onTimeRate = vendor.rating ? Math.min(100, Math.round(vendor.rating * 20)) : 95;

      performance.push({
        id: vendor._id,
        name: vendor.name,
        invited: invitedCount,
        submitted: submittedCount,
        awarded: awardedCount,
        avgDeliveryDays: Math.round(avgDelivery) || 'N/A',
        onTimeRate: `${onTimeRate}%`
      });
    }

    res.json(performance);
  } catch (error) {
    console.error('Vendor Report Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get procurement summary table & charts
// @route   GET /api/reports/summary
// @access  Private
router.get('/summary', protect, async (req, res) => {
  try {
    const { category } = req.query;

    // Last 6 months list
    const result = [];
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Status counts for RFQ donut chart
    let rfqStatusQuery = {};
    if (category && category !== 'All') {
      rfqStatusQuery.category = category;
    }
    const rfqs = await RFQ.find(rfqStatusQuery);
    const rfqStatus = { Open: 0, Closed: 0, Draft: 0, Completed: 0 };
    rfqs.forEach(r => {
      if (rfqStatus[r.status] !== undefined) rfqStatus[r.status]++;
    });

    const rfqStatusChart = Object.keys(rfqStatus).map(key => ({
      name: key,
      value: rfqStatus[key]
    }));

    // Top 5 Vendors by spend
    let poQuery = { status: { $in: ['sent', 'acknowledged'] } };
    const pos = await PurchaseOrder.find(poQuery).populate('vendorId', 'name');
    const vendorSpendMap = {};

    pos.forEach(po => {
      if (po.vendorId) {
        const name = po.vendorId.name;
        vendorSpendMap[name] = (vendorSpendMap[name] || 0) + po.totalAmount;
      }
    });

    const topVendorsChart = Object.keys(vendorSpendMap)
      .map(name => ({ name, spend: vendorSpendMap[name] }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    // Gather monthly summary metrics
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const label = `${monthsName[month - 1]} ${year}`;

      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);

      // RFQ created in month
      let rQuery = { createdAt: { $gte: start, $lte: end } };
      if (category && category !== 'All') rQuery.category = category;
      const rfqsCount = await RFQ.countDocuments(rQuery);

      // Quotes submitted in month
      const quotesCount = await Quotation.countDocuments({ createdAt: { $gte: start, $lte: end } });

      // POs generated in month
      const posCount = await PurchaseOrder.countDocuments({ createdAt: { $gte: start, $lte: end } });

      // Spend in month
      const spendInMonth = await PurchaseOrder.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: { $in: ['sent', 'acknowledged'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      const totalSpend = spendInMonth[0]?.total || 0;

      result.push({
        month: label,
        rfqsCreated: rfqsCount,
        quotesReceived: quotesCount,
        posGenerated: posCount,
        totalSpend
      });
    }

    res.json({
      summaryTable: result,
      rfqStatusChart,
      topVendorsChart
    });
  } catch (error) {
    console.error('Summary Report Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
