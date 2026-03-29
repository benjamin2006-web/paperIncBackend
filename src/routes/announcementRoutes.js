import express from 'express';
import { protect } from '../middleware/auth.js';
import Announcement from '../models/Announcement.js';

const router = express.Router();

// Cache for announcements
let cachedAnnouncements = null;
let cacheTime = null;
const CACHE_DURATION = 60000; // 1 minute cache

// Public - get active announcements (not expired)
router.get('/', async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedAnnouncements && cacheTime && now - cacheTime < CACHE_DURATION) {
      console.log(
        '📦 Returning cached announcements:',
        cachedAnnouncements.length,
      );
      return res.json({ success: true, data: cachedAnnouncements });
    }

    const currentDate = new Date();
    const announcements = await Announcement.find({
      $or: [{ expiresAt: { $gt: currentDate } }, { expiresAt: null }],
    })
      .sort({ createdAt: -1 })
      .limit(10);

    // Update cache
    cachedAnnouncements = announcements;
    cacheTime = now;

    console.log('📢 Fetched fresh announcements:', announcements.length);
    res.json({ success: true, data: announcements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin - get all announcements (no cache)
router.get('/all', protect, async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin - create announcement (clear cache on create)
router.post('/', protect, async (req, res) => {
  try {
    const { title, message, showBanner, showBell, expiresAt } = req.body;

    const announcement = new Announcement({
      title,
      message,
      showBanner: showBanner !== undefined ? showBanner : true,
      showBell: showBell !== undefined ? showBell : true,
      expiresAt: expiresAt || null,
      createdBy: req.admin._id,
    });

    await announcement.save();

    // Clear cache when new announcement is created
    cachedAnnouncements = null;
    cacheTime = null;

    console.log('✅ Announcement created:', announcement.title);
    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin - update announcement (clear cache on update)
router.put('/:id', protect, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );

    // Clear cache when announcement is updated
    cachedAnnouncements = null;
    cacheTime = null;

    res.json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin - delete announcement (clear cache on delete)
router.delete('/:id', protect, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);

    // Clear cache when announcement is deleted
    cachedAnnouncements = null;
    cacheTime = null;

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
