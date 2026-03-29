import User from '../models/User.js';

export const userLogin = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

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
    next(error);
  }
};

export const userVerifyToken = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
};
