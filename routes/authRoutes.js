const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/protect');

// Route to send OTP for phone number verification
router.post('/send-otp', authController.sendOTP);

// Route to verify OTP and proceed with registration or login
router.post('/verify-otp', authController.verifyOTP);

// Route to handle user login
router.post('/login', authController.login);
router.post('/addPost',protect,authController.addPost);
router.get('/user/:userId', authController.getUserDetails);
router.post('/vibes', protect, authController.addVibe);
router.put('/update-profile', protect, authController.updateUserProfile);
router.put('/update-username', protect, authController.updateUsername);
router.put('/update-password',protect, authController.updatePassword);
router.get('/user-token', authController.getUserid);
router.get('/allPosts',authController.getAllPosts);

module.exports = router;
