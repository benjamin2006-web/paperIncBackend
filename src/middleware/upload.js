import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Configure Cloudinary storage with better settings
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'exam-papers',
    resource_type: 'raw',
    allowed_formats: ['pdf'],
    timeout: 120000,
    // Add flags for inline viewing
    flags: 'attachment',
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/\.pdf$/i, '');
      const cleanName = originalName.replace(/[^a-zA-Z0-9]/g, '-');
      const publicId = `${timestamp}-${cleanName}`;
      console.log('📝 Generated public_id:', publicId);
      return publicId;
    },
  },
});

// File filter to accept only PDFs
const fileFilter = (req, file, cb) => {
  console.log('🔍 Checking file:', file.originalname);
  console.log('📄 MIME Type:', file.mimetype);
  console.log('📦 File Size:', file.size, 'bytes');

  if (file.mimetype === 'application/pdf') {
    console.log('✅ PDF accepted');
    cb(null, true);
  } else {
    console.log('❌ Rejected - not a PDF');
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Create multer instance with increased limits
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
}).single('pdf');
