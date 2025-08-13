import mongoose from 'mongoose';

const redeemCodeSchema = new mongoose.Schema(
  {
    isGuest: {
      type: Boolean,
      required: true,
      default: true
    },
    transactionId: {
      type: String,
      trim: true
    },
    redeemCodes5: [
      {
        code: { type: String, required: true },
        used: { type: Boolean, default: false }
      }
    ],
    redeemCodeSingle: {
      code: { type: String},
      used: { type: Boolean, default: false }
    },
    expiry: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

// ✅ Default export here
const RedeemCode = mongoose.model('RedeemCode', redeemCodeSchema);
export default RedeemCode;
