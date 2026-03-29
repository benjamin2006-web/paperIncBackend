import express from 'express';
import { protectUser } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Register a new user (no password required)
router.post('/register', async (req, res) => {
  try {
    const { name, phone } = req.body;

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
        createdAt: user.createdAt,
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

// Login with phone number (no password required)
router.post('/login', async (req, res) => {
  try {
    const { phone } = req.body;

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
        createdAt: user.createdAt,
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

// Get current user profile (protected - uses protectUser)
router.get('/me', protectUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        isVIP: user.isVIP,
        vipExpiryDate: user.vipExpiryDate,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
    });
  }
});

// Get user payment history
router.get('/me/payments', protectUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      payments: user.paymentHistory || [],
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history',
    });
  }
});

// Upgrade to VIP (user self-upgrade)
router.put('/me/upgrade', protectUser, async (req, res) => {
  try {
    const { durationMonths, amount, paymentMethod, paymentReference } =
      req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if already VIP and not expired
    if (
      user.isVIP &&
      user.vipExpiryDate &&
      new Date(user.vipExpiryDate) > new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active VIP subscription',
      });
    }

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

    user.isVIP = true;
    user.vipExpiryDate = expiryDate;

    // Add to payment history
    user.paymentHistory.push({
      amount: amount,
      method: paymentMethod,
      reference: paymentReference,
      duration: durationMonths,
    });

    await user.save();

    res.json({
      success: true,
      message: `VIP activated for ${durationMonths} months`,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        isVIP: user.isVIP,
        vipExpiryDate: user.vipExpiryDate,
      },
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade to VIP',
    });
  }
});

// Update user profile (protected - uses protectUser)
router.put('/me', protectUser, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (name) user.name = name;
    if (phone) {
      // Check if phone number is already taken by another user
      const existingUser = await User.findOne({
        phone,
        _id: { $ne: user._id },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already in use',
        });
      }
      user.phone = phone;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        isVIP: user.isVIP,
        vipExpiryDate: user.vipExpiryDate,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
});

// Delete user account (protected - uses protectUser)
router.delete('/me', protectUser, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
    });
  }
});

export default router;
