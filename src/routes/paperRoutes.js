import express from 'express';
import { protectAdmin, protect } from '../middleware/auth.js';
import { uploadHandler } from '../middleware/uploadHandler.js';
import {
  getPapers,
  searchPapers,
  getSearchSuggestions,
  createPapers,
  deletePaper,
  viewPDF,
  downloadPDF,
  getFilterOptions,
} from '../controllers/paperController.js';
import {
  checkCloudinaryStatus,
  testNetwork,
} from '../controllers/cloudinaryController.js';

const router = express.Router();

// Public routes
router.get('/', getPapers);
router.get('/filters', getFilterOptions);
router.get('/search', searchPapers);
router.get('/suggestions', getSearchSuggestions);
router.get('/view/:id', viewPDF);

// Admin only routes
router.post('/', protectAdmin, uploadHandler, createPapers);
router.delete('/:id', protectAdmin, deletePaper);

// Protected user routes (requires login)
router.get('/download/:id', protect, downloadPDF);

// Cloudinary status routes (for debugging)
router.get('/cloudinary/status', checkCloudinaryStatus);
router.get('/network/test', testNetwork);

export default router;
