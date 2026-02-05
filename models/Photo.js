import mongoose from 'mongoose';

const photoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },

    originalName: { type: String, required: true, trim: true },

    // stored filenames (no paths)
    originalFile: { type: String, required: true, trim: true },
    thumbFile: { type: String, required: true, trim: true },
    largeFile: { type: String, required: true, trim: true },

    // optional image info (nice for “details” panel)
    width: { type: Number },
    height: { type: Number },

    originalBytes: { type: Number },
    thumbBytes: { type: Number },
    largeBytes: { type: Number },

  },
  { timestamps: true }
);

photoSchema.index({ createdAt: -1 });

export default mongoose.model('Photo', photoSchema);
