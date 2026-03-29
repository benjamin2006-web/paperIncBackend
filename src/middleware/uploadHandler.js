import { upload } from './upload.js';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

const checkCloudinaryReachable = async () => {
  try {
    await dnsLookup('api.cloudinary.com');
    console.log('✅ Cloudinary DNS resolved - upload ready');
    return true;
  } catch (err) {
    console.error('❌ Cloudinary DNS resolution failed:', err.message);
    return false;
  }
};

export const uploadHandler = async (req, res, next) => {
  try {
    // Check if Cloudinary is reachable
    const isReachable = await checkCloudinaryReachable();
    if (!isReachable) {
      return res.status(503).json({
        success: false,
        message:
          'Cannot connect to Cloudinary. Please check your internet connection.',
        details: 'DNS resolution failed for api.cloudinary.com',
        solution:
          'Try: ipconfig /flushdns in Command Prompt (as Administrator)',
      });
    }

    upload(req, res, (err) => {
      if (err) {
        console.error('Upload error:', err);

        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 20MB',
          });
        }

        if (err.message && err.message.includes('PDF')) {
          return res.status(400).json({
            success: false,
            message: 'Only PDF files are allowed',
          });
        }

        if (err.message && err.message.includes('ENOTFOUND')) {
          return res.status(503).json({
            success: false,
            message: 'Cannot reach Cloudinary. Check your internet connection.',
            error: err.message,
          });
        }

        return res.status(500).json({
          success: false,
          message: 'Upload failed: ' + err.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      console.log('✅ Upload successful');
      console.log('Cloudinary URL:', req.file.path);
      console.log('Public ID:', req.file.filename);
      next();
    });
  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed: ' + error.message,
    });
  }
};
