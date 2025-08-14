import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    walletName: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    totalCoin: { type: Number, default: 0 },
    walletType: { type: String, enum: ['personal', 'professional'], default: 'personal' },
    professionalWallet: { type: Boolean, default: false },

    apiKey: { type: String, unique: true, index: true },

    redeemCode: {
      type: Map,
      of: String,
      default: {}
    },

    usedCode: {
      type: Map,
      of: String,
      default: {}
    },

    isGuest: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
