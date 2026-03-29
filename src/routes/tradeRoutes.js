import express from 'express';
import { protect } from '../middleware/auth.js';
import Trade from '../models/Trade.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/', async (req, res) => {
  try {
    let trades = await Trade.findOne();
    if (!trades) {
      return res.json({
        'L5 TVET': [],
        'S6 ANP': [],
        'S6 GE': [],
        'Y3 TTC': [],
      });
    }
    res.json(trades.data);
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ message: 'Failed to fetch trades' });
  }
});

// Admin routes - protected
router.post('/', protect, async (req, res) => {
  try {
    let trades = await Trade.findOne();
    if (trades) {
      trades.data = req.body;
      await trades.save();
    } else {
      trades = new Trade({ data: req.body });
      await trades.save();
    }
    res.json({ success: true, message: 'Trades saved successfully' });
  } catch (error) {
    console.error('Error saving trades:', error);
    res.status(500).json({ message: 'Failed to save trades' });
  }
});

export default router;
