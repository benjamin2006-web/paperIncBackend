import mongoose from 'mongoose';

const paperSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    trade: {
      type: String,
      required: false,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: new Date().getFullYear(),
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    pdfUrl: {
      type: String,
      required: true,
    },
    pdfPublicId: {
      type: String,
      required: true,
    },
    isVIPOnly: {
      type: Boolean,
      default: false, // false = free for all users, true = only VIP users
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better performance
paperSchema.index({ category: 1, year: -1 });
paperSchema.index({ trade: 1 });
paperSchema.index({ isVIPOnly: 1 });
paperSchema.index({ createdAt: -1 });

export default mongoose.model('Paper', paperSchema);
