import express from 'express';
import { protect } from '../middleware/auth.js';
import Category from '../models/Category.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/', async (req, res) => {
  try {
    let categories = await Category.findOne();
    if (!categories) {
      return res.json([]);
    }
    res.json(categories.data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Admin routes - protected
router.post('/', protect, async (req, res) => {
  try {
    let categories = await Category.findOne();
    if (categories) {
      categories.data = req.body;
      await categories.save();
    } else {
      categories = new Category({ data: req.body });
      await categories.save();
    }
    res.json({ success: true, message: 'Categories saved successfully' });
  } catch (error) {
    console.error('Error saving categories:', error);
    res.status(500).json({ message: 'Failed to save categories' });
  }
});

export default router;
