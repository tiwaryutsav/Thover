const User = require('../models/User');
const twilioService = require('../services/twilioService');
const catchAsync = require('../utils/catchAsync');

// Route to send OTP using Twilio Verify API
exports.sendOTP = catchAsync(async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required'
    });
  }

  await twilioService.sendSMS(phoneNumber);

  res.json({
    success: true,
    message: 'OTP sent successfully'
  });
});

// Route to verify OTP and register user
exports.verifyOTP = catchAsync(async (req, res) => {
  const { phoneNumber, otp, userData } = req.body;

  if (!phoneNumber || !otp || !userData) {
    return res.status(400).json({
      success: false,
      message: 'Phone number, OTP, and user data are required'
    });
  }

  const verification = await twilioService.verifyOTP(phoneNumber, otp);

  if (verification.status !== 'approved') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired OTP'
    });
  }

  const existingUser = await User.findOne({
    $or: [
      { userId: userData.userId },
      { phoneNumber: userData.phoneNumber },
      { email: userData.email }
    ]
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message:
        existingUser.userId === userData.userId
          ? 'User ID already exists'
          : existingUser.email === userData.email
          ? 'Email already registered'
          : 'Phone number already registered'
    });
  }

  const newUser = await User.create({
    username: userData.username,
    userId: userData.userId,
    email: userData.email,
    password: userData.password,
    phoneNumber: userData.phoneNumber,
    name: userData.name
  });

  res.json({
    success: true,
    message: 'Registration successful'
  });
});

// Route to login user
exports.login = catchAsync(async (req, res) => {
  const { username, password } = req.body;

  // Check if the email and password are provided
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  // Find the user by email
  const user = await User.findOne({ username }).select('+password');  // Ensure password is also selected
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Compare the provided password with the stored hashed password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // If successful, return user data (excluding password)
  res.json({
    success: true,
    message: 'Login successful',
    
  });
});





