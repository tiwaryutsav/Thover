import express from 'express';
const router = express.Router();
import protect  from '../middleware/protect.js';
import * as authController from '../controllers/authController.js';
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });

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
router.post('/send-otp_email', authController.sendOTP_email);
router.post('/register_email', authController.register_email);
router.post('/report_post', protect,authController.addPostReport);
router.post('/report_vive', protect,authController.addViveReport);
router.put('/update_profession', protect, authController.updateProfessionalInfo);
router.post('/add_feedback', protect, authController.addFeedback);
router.get('/all_feedback', protect, authController.getAllFeedbacks);
router.patch('/update_post', protect, authController.updatePost);
router.post('/update-password',  authController.updatePasswordWithOldPassword);
router.put('/update-password-email', authController.updatePasswordWithEmailOtp);
router.post('/vibes/getByPostAndVibe',protect, authController.getVibeAndAllByPostId);
// router.post('/sendWhatsApp', authController.sendWhatsAppOtp);
router.post('/sendWhatsApp', authController.sendWhatsAppOtp);
router.post('/verifyWhatsapp',protect, authController.verifyWhatsAppOtp);
router.post('/addReferral', protect, authController.addReferral);
router.post('/checkReferral',protect, authController.checkReferralCode);
router.post('/login-email', authController.loginWithEmail);
router.post('/apply-referral',authController.applyReferralCode);
router.post('/referral-code',protect, authController.getReferralByUserId);
router.delete('/delete_post', protect, authController.deletePost);
router.delete('/delete_vibe', protect, authController.deleteVibe);
router.get('/search_user', protect, authController.searchByUsername);
router.get('/search_topic', protect, authController.searchByPostTopic);
router.put('/send-otp-reset-password' ,authController.sendOTP_resetPassword);
router.post('/get_topic_posts', protect, authController.getPostsByTopicFromBody);
router.get('/update-spotlite', protect,authController.updateSpotlite);
router.post('/get-vibes', protect, authController.VibesByUserId);
router.post('/update-documents', protect, authController.updateDocuments);
router.post('/check-username',  authController.checkUsername);
router.post(
  '/add_questions',
  protect,
  upload.single('file'), // 👈 parses both file and body
  authController.uploadCsvQuestions
);
export default router;