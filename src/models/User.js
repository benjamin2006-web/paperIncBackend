import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isVIP: {
      type: Boolean,
      default: false,
    },
    vipExpiryDate: {
      type: Date,
      default: null,
    },
    paymentHistory: [
      {
        amount: Number,
        date: {
          type: Date,
          default: Date.now,
        },
        method: String,
        reference: String,
        duration: Number, // months
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    },
  
  {
    timestamps: true,
  },
);

// Check if VIP is active
userSchema.methods.isVIPActive = function () {
  if (!this.isVIP) return false;
  if (this.vipExpiryDate && new Date(this.vipExpiryDate) < new Date()) {
    return false;
  }
  return true;
};

// Generate token for user
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, phone: this.phone, name: this.name, isVIP: this.isVIP },
    process.env.JWT_SECRET,
    { expiresIn: '30d' },
  );
};

export default mongoose.model('User', userSchema);
