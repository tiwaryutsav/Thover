import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      enum: [
        "TPWallet",
        "buyCoin",
        "sellCoin",
        "sellCoinRequest", // ✅ special case
        "buyLoyaltyCode",
        "redeemLoyaltyCode",
        "gotCoin",
        "sentCoin",
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

    // Loyalty code specific
    toLoyaltyCode: { type: String },   // for buy
    fromLoyaltyCode: { type: String }, // for redeem

    // ✅ Status field, but only used for sellCoinRequest
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      required: false,
      default: undefined,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ✅ Pre-save hook: only set status when transactionType = sellCoinRequest
transactionSchema.pre("save", function (next) {
  if (this.transactionType === "sellCoinRequest" && !this.status) {
    this.status = "processing"; // default
  } else if (this.transactionType !== "sellCoinRequest") {
    this.status = undefined; // don’t store status for others
  }
  next();
});

export default mongoose.model("Transaction", transactionSchema);
