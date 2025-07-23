import mongoose from 'mongoose';

const launchPadSchema = new mongoose.Schema(
  {
    startupName: { type: String, required: true, trim: true },
    founderName: { type: String, required: true, trim: true },
    industry: { type: String, required: true },
    startupIdea: { type: String, required: true },
    uniqueSellingPoint: { type: String, required: true },
    status: { type: String, default: 'Pending' },
    message: { type: String, default: '' },

    // userId is optional now
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },

    // ✅ new fields
    payment: { type: Boolean, default: false }, // defaults to false
    email: { type: String, required: true, trim: true },
    whatsappNumber: { type: String, required: true, trim: true }
  },
  {
    timestamps: true,
  }
);

const LaunchPad = mongoose.model('LaunchPad', launchPadSchema);
export default LaunchPad;
