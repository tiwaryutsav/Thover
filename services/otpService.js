import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const otpStore = new Map(); // In production, replace this with Redis or a database

const generateOtp = () => Math.floor(100000 + Math.random() * 900000);

export const sendOtpToEmail = async (email) => {
  const normalizedEmail = email.toLowerCase();
  const otp = generateOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  otpStore.set(normalizedEmail, { otp, expiresAt });

  await resend.emails.send({
    from: 'otp@thover.in',
    to: email,
    subject: 'Your OTP Code',
    html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`, // Fixed template string usage
  });
};

export const verifyOtp = (email, inputOtp) => {
  const normalizedEmail = email.toLowerCase();
  const record = otpStore.get(normalizedEmail);

  if (!record) return { success: false, message: 'OTP not found' };

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return { success: false, message: 'OTP expired' };
  }

  if (parseInt(inputOtp) !== record.otp) {
    return { success: false, message: 'Invalid OTP' };
  }

  otpStore.delete(normalizedEmail);
  return { success: true };
};