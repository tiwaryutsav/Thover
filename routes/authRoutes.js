const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route to send OTP for phone number verification
router.post('/send-otp', authController.sendOTP);

// Route to verify OTP and proceed with registration or login
router.post('/verify-otp', authController.verifyOTP);

// Route to handle user login
router.post('/login', authController.login);

module.exports = router;
