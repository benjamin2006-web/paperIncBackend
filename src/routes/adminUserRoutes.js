import express from 'express';
import { protectAdmin } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Pricing in FRW
const pricing = {
  1: 500, // 1 month - 500 FRW
  3: 1200, // 3 months - 1200 FRW
  6: 2000, // 6 months - 2000 FRW
  12: 3500, // 12 months - 3500 FRW
};

// Get all users
router.get('/users', protectAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
});

// Get single user
router.get('/users/:id', protectAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
    });
  }
});

// Update user VIP status with payment info
router.put('/users/:id/vip', protectAdmin, async (req, res) => {
  try {
    const { isVIP, durationMonths, paymentMethod, paymentReference, amount } =
      req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Calculate amount if not provided
    const calculatedAmount =
      amount || (durationMonths ? pricing[durationMonths] : 0);

    if (isVIP && durationMonths) {
      // Set VIP status
      user.isVIP = true;

      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
      user.vipExpiryDate = expiryDate;

      // Add to payment history
      user.paymentHistory.push({
        amount: calculatedAmount,
        method: paymentMethod || 'admin',
        reference: paymentReference || '',
        duration: durationMonths,
      });

      console.log(
        `✅ VIP activated for ${user.name} - ${durationMonths} months - ${calculatedAmount} FRW`,
      );
    } else if (!isVIP) {
      // Remove VIP status
      user.isVIP = false;
      user.vipExpiryDate = null;
      console.log(`❌ VIP removed for ${user.name}`);
    }

    await user.save();

    res.json({
      success: true,
      message: `User VIP status updated to ${isVIP ? 'VIP' : 'Regular'}`,
      user,
    });
  } catch (error) {
    console.error('Error updating VIP status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update VIP status',
    });
  }
});

// Add payment manually
router.post('/users/:id/payment', protectAdmin, async (req, res) => {
  try {
    const { amount, method, reference, duration } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.paymentHistory.push({
      amount,
      method,
      reference,
      duration,
    });

    // If VIP payment, extend or set VIP
    if (duration) {
      user.isVIP = true;
      if (user.vipExpiryDate) {
        const newExpiry = new Date(user.vipExpiryDate);
        newExpiry.setMonth(newExpiry.getMonth() + duration);
        user.vipExpiryDate = newExpiry;
      } else {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + duration);
        user.vipExpiryDate = expiryDate;
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      user,
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
    });
  }
});

// Delete user
router.delete('/users/:id', protectAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
    });
  }
});

// Get VIP statistics
router.get('/stats/vip', protectAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const vipUsers = await User.countDocuments({ isVIP: true });
    const activeVIP = await User.countDocuments({
      isVIP: true,
      vipExpiryDate: { $gt: new Date() },
    });
    const expiredVIP = await User.countDocuments({
      isVIP: true,
      vipExpiryDate: { $lt: new Date() },
    });

    // Get total revenue in FRW
    const allUsers = await User.find();
    const totalRevenue = allUsers.reduce((sum, user) => {
      return sum + user.paymentHistory.reduce((s, p) => s + (p.amount || 0), 0);
    }, 0);

    res.json({
      success: true,
      stats: {
        totalUsers,
        vipUsers,
        activeVIP,
        expiredVIP,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
    });
  }
});

// Get payment history for a user
router.get('/users/:id/payments', protectAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.json({
      success: true,
      payments: user.paymentHistory,
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
    });
  }
});

export default router;
