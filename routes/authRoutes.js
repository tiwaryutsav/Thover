import express from 'express';
const router = express.Router();
import protect  from '../middleware/protect.js';
import * as authController from '../controllers/authController.js';


// Route to send OTP for phone number verification
router.post('/send-otp', authController.sendOTP);

// Route to verify OTP and proceed with registration or login
router.post('/register', authController.register);

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
router.get('/post/:postId', protect, authController.getVibesByPostId);
router.post('/add-profile-pic', protect, authController.addProfilePic);
router.put('/update-profile-pic', protect, authController.updateProfilePic);

router.get('/update-location', protect, authController.getArea);

export default router;