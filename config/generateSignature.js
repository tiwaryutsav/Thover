import { createHmac } from "crypto";

// 🔹 Your Razorpay Key Secret (from .env / dashboard)
const RAZORPAY_KEY_SECRET = "8dcMbrdpH6eubKZgGyNtCrQZ";

// ✅ Real orderId you got from createOrder response
const order_id = "order_R8F1baofOmj7Uu";

// ✅ Replace with actual payment_id (when you test payment)
// For now, use a dummy like "pay_test_123456"
const payment_id = "pay_test_123456";

// Generate signature
const generated_signature = createHmac("sha256", RAZORPAY_KEY_SECRET)
  .update(order_id + "|" + payment_id)
  .digest("hex");

// Print output for Postman
console.log("Use these values in Postman:");
console.log("razorpay_order_id:", order_id);
console.log("razorpay_payment_id:", payment_id);
console.log("razorpay_signature:", generated_signature);
