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
router.post('/user-token', protect,authController.getUserid);
router.get('/allPosts',authController.getAllPosts);
router.get('/vibes/:postId', protect, authController.getVibesByPostId);
router.put('/add-update-profile-pic', protect, authController.addUpdateProfilePic);
router.get('/post/:postId', protect,authController.getPostById);
router.post('/follow', protect, authController.followers);
router.post('/unfollow', protect, authController.unfollow);
router.post('/like', protect, authController.likeVibe);
router.post('/unlike', protect, authController.unlikeVibe);
router.post('/favorite', protect, protect,authController.favoritePost);
router.post('/unfavorite', protect, authController.unfavoritePost);
router.get('/user/:userId/posts', protect, authController.getPostsByUserId);
router.get('/user/:userId/vibes', protect, authController.getVibesByUserId);
router.get('/posts/most-vibes', protect, authController.getPostIdsWithMostVibes);
router.post('/location', protect, authController.setArea);
router.post('/account', protect, authController.setAccountInfo);
router.post("/check_favorite",protect,authController.checkFavoriteStatus);
router.post("/create_connection", protect, authController.createConnection);
router.post("/check_connection", protect, authController.checkConnection);
router.post("/fetch_connections", protect, authController.getUserConnections);
router.post("/fetch_connection_from", protect, authController.getUserConnection_from);


export default router;