// models/Order.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,     // snapshot of product name
        price: Number,    // snapshot of price at order time
        quantity: Number,
      },
    ],

    totalAmount: { type: Number, required: true }, // in paise
    currency: { type: String, default: "INR" },

    razorpayOrderId: { type: String, required: true }, // ✅ link to Razorpay order
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" }, // ✅ link to payment

    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
