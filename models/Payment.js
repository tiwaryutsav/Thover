// models/Payment.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true }, // Razorpay orderId
    paymentId: { type: String },               // Razorpay paymentId
    signature: { type: String },               // Razorpay signature
    amount: { type: Number, required: true },  // in paise
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["created", "success", "failed", "pending"],
      default: "created",
    },
    method: { type: String }, // card, upi, netbanking etc.
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
