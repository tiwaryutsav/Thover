import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      enum: [
        "TPWallet",
        "buyCoin",
        "sellCoin",
        "buyLoyaltyCard",
        "redeemLoyaltyCard",
      ],
      required: true,
    },

    // Common
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    coin: { type: Number },

    // Wallet references
    fromWallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
    toWallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },

    // TPWallet-specific
    redeemCode: { type: String },

    // Coin Buy/Sell specific
    amount: { type: Number },

    // Loyalty card specific
    toLoyaltyCard: { type: mongoose.Schema.Types.ObjectId, ref: "LoyaltyCard" },   // for buy
    fromLoyaltyCard: { type: mongoose.Schema.Types.ObjectId, ref: "LoyaltyCard" }, // for redeem
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Transaction", transactionSchema);
