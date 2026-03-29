import express from 'express';
import { upload } from '../middleware/upload.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Test upload endpoint
router.post('/test-upload', protect, upload.single('pdf'), async (req, res) => {
  try {
    console.log('Test upload received');
    console.log('File:', req.file);
    console.log('Body:', req.body);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    res.json({
      success: true,
      message: 'Upload successful',
      file: {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
      },
    });
  } catch (error) {
    console.error('Test upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
