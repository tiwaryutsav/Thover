import dotenv from 'dotenv';
import twilioPkg from 'twilio';

// Load environment variables from .env file
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilioPkg(accountSid, authToken);

// Send OTP via SMS
export async function sendSMS(phoneNumber) {
  try {
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: phoneNumber,
        channel: 'sms',
      });

    console.log("OTP sent. SID:", verification.sid);
    return verification.sid;
  } catch (error) {
    console.error("Twilio sendSMS error:", error);
    throw new Error('Failed to send OTP');
  }
}

// Verify OTP
export async function verifyOTP(phoneNumber, code) {
  try {
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code: code,
      });

    console.log("OTP verification result:", verificationCheck);
    return verificationCheck;
  } catch (error) {
    console.error("Twilio verifyOTP error:", error);
    throw new Error('OTP verification failed');
  }
}
