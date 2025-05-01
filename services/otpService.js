const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes

class OTPService {
  constructor() {
    this.otpStore = new Map();
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  storeOTP(phoneNumber, otp) {
    this.otpStore.set(phoneNumber, {
      otp,
      expiry: Date.now() + OTP_EXPIRY
    });
  }

  verifyOTP(phoneNumber, otp) {
    const storedData = this.otpStore.get(phoneNumber);
    
    if (!storedData) {
      return { valid: false, message: 'OTP expired or not sent' };
    }

    if (Date.now() > storedData.expiry) {
      this.otpStore.delete(phoneNumber);
      return { valid: false, message: 'OTP expired' };
    }

    if (storedData.otp !== otp) {
      return { valid: false, message: 'Invalid OTP' };
    }

    this.otpStore.delete(phoneNumber);
    return { valid: true };
  }
}

module.exports = new OTPService(); 