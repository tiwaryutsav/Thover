import mongoose from "mongoose";

const loyaltyCardSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    codeValue: {
      type: Number,
      required: true,
      default: 0,
    },
    isPrivateUse: {
      type: Boolean,
      required: true,
      default: false,
    },
    loyaltyCode: {
      type: String,
      required: true, // you can remove this if it’s optional
    },
    isCodeUsed: {
      type: Boolean,
      default: false,
    },
    expiryDate: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("LoyaltyCard", loyaltyCardSchema);
