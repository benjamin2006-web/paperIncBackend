import express from 'express';
import { login, verifyToken } from '../controllers/authController.js';
import { protectAdmin, protectUser, protect } from '../middleware/auth.js';

const router = express.Router();

// Admin login route
router.post('/admin/login', login);

// Admin token verification
router.get('/admin/verify', protectAdmin, verifyToken);

// User login route
router.post('/user/login', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    const User = (await import('../models/User.js')).default;
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.',
      });
    }

    const token = user.generateToken();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
});

// User token verification
router.get('/user/verify', protectUser, verifyToken);

// Combined route for both admin and user (if needed)
router.get('/verify', protect, verifyToken);

export default router;
