import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('Admin login attempt for:', email);

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    console.log('Admin login successful for:', email);

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    next(error);
  }
};

export const adminVerifyToken = async (req, res) => {
  res.json({
    success: true,
    admin: req.admin,
  });
};
