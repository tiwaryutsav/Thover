import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    walletName: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    totalCoin: { type: Number, default: 0 },
    walletType: { type: String, enum: ['personal', 'professional'], default: 'personal' },
    professionalWallet: { type: Boolean, default: false },

    redeemCode: {
      type: Map,
      of: String, // { "0": "codeValue", "1": "codeValue" }
      default: {}
    },

    usedCode: {
      type: Map,
      of: String, // { "0": "usedCodeValue", "1": "usedCodeValue" }
      default: {}
    },

    isGuest: { type: Boolean, default: true } // ✅ True if not logged in, false if logged in
  },
  {
    timestamps: true // ✅ createdAt & updatedAt automatically
  }
);

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
