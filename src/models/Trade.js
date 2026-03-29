import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema(
  {
    data: {
      type: Object,
      required: true,
      default: {
        'L5 TVET': [],
        'S6 ANP': [],
        'S6 GE': [],
        'Y3 TTC': [],
      },
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model('Trade', tradeSchema);
