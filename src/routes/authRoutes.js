import express from 'express';
import { login, verifyToken } from '../controllers/authController.js';
import { protectAdmin, protectUser, protect } from '../middleware/auth.js';

const router = express.Router();

// ============ ADMIN ROUTES ============
// Admin login
router.post('/admin/login', login);

// Admin token verification
router.get('/admin/verify', protectAdmin, verifyToken);

// ============ USER ROUTES ============
// User registration (signup)
router.post('/register', async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    // Import User model
    const User = (await import('../models/User.js')).default;
    
    // Validate input
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone number are required',
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered',
      });
    }
    
    // Create new user
    const user = new User({
      name,
      phone,
    });
    
    await user.save();
    
    // Generate token
    const token = user.generateToken();
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        isVIP: user.isVIP,
        vipExpiryDate: user.vipExpiryDate,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Import User model
    const User = (await import('../models/User.js')).default;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }
    
    // Find user by phone number
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.',
      });
    }
    
    // Generate token
    const token = user.generateToken();
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        isVIP: user.isVIP,
        vipExpiryDate: user.vipExpiryDate,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
});

// User token verification
router.get('/user/verify', protectUser, verifyToken);

// Combined route for both admin and user
router.get('/verify', protect, verifyToken);

export default router;
