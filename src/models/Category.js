import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    data: {
      type: Array,
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model('Category', categorySchema);
