import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const otpStore = new Map(); // You should replace this with Redis or DB in production

const generateOtp = () => Math.floor(100000 + Math.random() * 900000);

export const sendOtpToEmail = async (email) => {
  const otp = generateOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  otpStore.set(email, { otp, expiresAt });

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'Your OTP Code',
    html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`
  });
};

export const verifyOtp = (email, inputOtp) => {
  const record = otpStore.get(email);

  if (!record) return { success: false, message: 'OTP not found' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return { success: false, message: 'OTP expired' };
  }

  if (parseInt(inputOtp) !== record.otp) return { success: false, message: 'Invalid OTP' };

  otpStore.delete(email);
  return { success: true };
};

