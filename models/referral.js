import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema(
  {
    referralCode: {
      type: String,
      required: true,
      unique: true, // assuming each referral code should be unique
    },
    coin: {
      type: Number,
      default: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true, // optional, adds createdAt and updatedAt
  }
);

export const Referral = mongoose.model('Referral', referralSchema);
export default Referral;
