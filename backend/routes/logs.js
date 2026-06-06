import express from 'express';
import ActivityLog from '../models/ActivityLog.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get all audit activity logs with filters
// @route   GET /api/logs
// @access  Private
router.get('/', protect, async (req, res) => {
  const { module, actor, fromDate, toDate } = req.query;
  let query = {};

  if (module && module !== 'All') {
    query.module = module;
  }

  if (actor) {
    query.actorName = { $regex: actor, $options: 'i' };
  }

  // Date range filter
  if (fromDate || toDate) {
    query.timestamp = {};
    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0,0,0,0);
      query.timestamp.$gte = start;
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23,59,59,999);
      query.timestamp.$lte = end;
    }
  }

  try {
    const logs = await ActivityLog.find(query).sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
