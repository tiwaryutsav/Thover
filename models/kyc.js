import mongoose from 'mongoose';

const kycSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ✅ KYC details
    kycStatus: { type: String, default: 'Not verified' },
    isKycVerified: { type: Boolean, default: false }, // 🔹 moved here
    ownerName: { type: String, default: null },
    businessName: { type: String, default: null },
    document_no: { type: String, default: null },
    document_name: { type: String, default: null },
    document_url: { type: String, default: null },

    // ✅ Profession (optional fields)
    professionType: { type: String, default: null },
    profession: { type: String, default: null },
  },
  { timestamps: true }
);

const Kyc = mongoose.model('Kyc', kycSchema);
export default Kyc;
