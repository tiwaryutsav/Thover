import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendSMS, verifyOTP } from '../services/twilioService.js';
import * as twilioService from '../services/twilioService.js'; // Correct the path as needed
import catchAsync from '../utils/catchAsync.js';
import Post from '../models/Post.js';  // Adjust the path as needed
import Vibe from '../models/Vibe.js';
import mongoose from 'mongoose';  // Add this line at the top of your file
import Favorite from '../models/Favorite.js';
import { Connection } from '../models/Connection.js'; // adjust path as needed
import { sendOtpToEmail, verifyOtp } from '../services/otpService.js';
import Report from '../models/Report.js';
import Feedback from '../models/Feedback.js';
import axios from 'axios';




// Route to send OTP using Twilio Verify API
export const sendOTP = catchAsync(async (req, res) => {
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

export const register = catchAsync(async (req, res) => {
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
    phoneNumber: userData.phoneNumber
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Phone number already registered'
    });
  }

  const newUser = await User.create({
    username: userData.username,
    password: userData.password,
    phoneNumber: userData.phoneNumber,
    name: userData.name,
  });

  const token = await newUser.generateAuthToken();

  res.json({
    success: true,
    message: 'Registration successful',
    userId: newUser.userId,
    token
  });
});

// Route to login user
export const login = catchAsync(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  const user = await User.findOne({ username }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'No user found'
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  const token = await user.generateAuthToken();

  res.json({
    success: true,
    message: 'Login successful',
    token,
    userId: user._id
  });
});


//Route to add post
export const addPost = catchAsync(async (req, res) => {
  const { topic, description, images, imagePath, price } = req.body;

  // Ensure req.user is available (from protect middleware)
  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User information missing',
    });
  }

  const userId = req.user._id;

  // Validate fields
  if (
    !topic ||
    !description ||
    !imagePath ||
    !images ||
    !Array.isArray(images) ||
    images.length === 0 ||
    typeof price !== 'string' ||
    price.trim() === ''
  ) {
    return res.status(400).json({
      success: false,
      message: 'Topic, description, imagePath, at least one image, and price are required',
    });
  }

  const post = await Post.create({
    topic,
    description,
    images,
    imagePath,
    price, // keep it as-is, even with symbols like "$25"
    user: userId,
  });

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    post,
  });
});



//Route to get all user Details
export const getUserDetails = catchAsync(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required',
    });
  }

  // Find user by their custom userId field (not _id)
  const user = await User.findOne({ userId }).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Fetch posts created by this user using their _id
  const posts = await Post.find({ user: user._id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    user,
    posts,
  });
});

// Route to add a vibe
export const addVibe = catchAsync(async (req, res) => {
  const { images, rating, text, imagePath, postId, topic, vibeType } = req.body;

  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User information missing',
    });
  }

  const userId = req.user._id;

  // Validate input
  if (!text || !postId) {
    return res.status(400).json({
      success: false,
      message: 'Text and postId are required',
    });
  }

  // Optional: verify the postId exists
  const postExists = await Post.findById(postId);
  if (!postExists) {
    return res.status(404).json({
      success: false,
      message: 'Post not found',
    });
  }

  const vibe = await Vibe.create({
    images,
    rating,
    text,
    imagePath,
    user: userId,
    post: postId,
    topic,
    vibeType
  });

  res.status(201).json({
    success: true,
    message: 'Vibe created and linked to post successfully',
    vibe,
  });
});

export const getUserid = catchAsync(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Token is required'
    });
  }

  // Find user by their token (assuming token is stored as a field in the User model)
  const user = await User.findOne({ token }).select('userId'); // Only select userId field

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    userId: user.userId // Only send back the userId
  });
});

//Route to get all the vibes through postid


// Route to update profile
export const updateUserProfile = catchAsync(async (req, res) => {
  const { Bio, name } = req.body;

  // 1. Ensure the user is authenticated
  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User not logged in',
    });
  }

  // 2. Fetch the full user record
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // 3. Apply updates (excluding phoneNumber and username)
  if (Bio) user.Bio = Bio;
  if (name) user.name = name;

  await user.save();

  // 4. Send back updated info
  res.status(200).json({
    success: true,
    message: 'User profile updated successfully',
    user: {
      _id: user._id,
      username: user.username, // included for client display
      name: user.name,
      Bio: user.Bio
    }
  });
});



//upadte username
export const updateUsername = catchAsync(async (req, res) => {
  const { oldUsername, newUsername } = req.body;

  // 1. Ensure the user is authenticated
  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User not logged in',
    });
  }

  // 2. Fetch the user
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // 3. Validate old username
  if (user.username !== oldUsername) {
    return res.status(400).json({
      success: false,
      message: 'Old username does not match our records',
    });
  }

  // 4. Validate new username
  if (!newUsername || !newUsername.trim()) {
    return res.status(400).json({
      success: false,
      message: 'New username is required',
    });
  }

  // 5. Check if the new username is already taken
  const existingUser = await User.findOne({ username: newUsername });
  if (existingUser && existingUser._id.toString() !== user._id.toString()) {
    return res.status(409).json({
      success: false,
      message: 'Username is already taken',
    });
  }

  // 6. Update username
  user.username = newUsername;
  await user.save();

  // 7. Respond
  res.status(200).json({
    success: true,
    message: 'Username updated successfully',
    user: {
      _id: user._id,
      username: user.username
    }
  });
});


//Route to update password using otp
export const updatePassword = catchAsync(async (req, res) => {
  const { phoneNumber, otp, userData } = req.body;

  if (
    !phoneNumber ||
    !otp ||
    !userData ||
    !userData.password ||
    !userData.confirmPassword
  ) {
    return res.status(400).json({
      success: false,
      message: 'Phone number, OTP, password, and confirm password are required'
    });
  }

  if (userData.password !== userData.confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Password and confirm password do not match'
    });
  }

  const verification = await twilioService.verifyOTP(phoneNumber, otp);

  if (verification.status !== 'approved') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired OTP'
    });
  }

  const existingUser = await User.findOne({ phoneNumber });

  if (!existingUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Update password in plain text
  existingUser.password = userData.password;
  await existingUser.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
});



//Route to get all the post

export const getAllPosts = catchAsync(async (req, res) => {
  const posts = await Post.find();

  res.status(200).json({
    success: true,
    count: posts.length,
    posts,
  });
});

//Route to get vives through postid
export const getVibesByPostId = catchAsync(async (req, res) => {
  const { postId } = req.params;

  // Optional: Validate post existence
  const postExists = await Post.findById(postId);
  if (!postExists) {
    return res.status(404).json({
      success: false,
      message: 'Post not found',
    });
  }

  const vibes = await Vibe.find({ post: postId }).populate('user', 'name email');

  res.status(200).json({
    success: true,
    count: vibes.length,
    vibes,
  });
});

//Add route to add Profile pic
// controllers/userController.js
// export const addProfilePic = catchAsync(async (req, res) => {
//   const { imageUrl, imagePath } = req.body; // ✅ properly extract both

//   if (!req.user || !req.user._id) {
//     return res.status(401).json({
//       success: false,
//       message: 'Unauthorized: User information missing',
//     });
//   }

//   if (!imageUrl && !imagePath) {
//     return res.status(400).json({
//       success: false,
//       message: 'Either imageUrl or imagePath is required',
//     });
//   }

//   const user = await User.findById(req.user._id);
//   if (!user) {
//     return res.status(404).json({
//       success: false,
//       message: 'User not found',
//     });
//   }

//   // Set the profile picture (only if not already set)
//   if (!user.profile_pic) {
//     user.profile_pic = imageUrl || imagePath; // ✅ prioritize imageUrl if both
//     await user.save();

//     return res.status(201).json({
//       success: true,
//       message: 'Profile picture added successfully',
//       profile_pic: user.profile_pic,
//     });
//   } else {
//     return res.status(400).json({
//       success: false,
//       message: 'Profile picture already exists. Use update route if needed.',
//     });
//   }
// });

//update profile pic
export const addUpdateProfilePic = catchAsync(async (req, res) => {
  const { imageUrl, imagePath } = req.body;

  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User information missing',
    });
  }

  if (!imageUrl && !imagePath) {
    return res.status(400).json({
      success: false,
      message: 'Either imageUrl or imagePath is required',
    });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // If no profile picture is present, add one. Otherwise, update the existing one.
  if (!user.profile_pic) {
    user.profile_pic = imageUrl || imagePath; // Add new profile picture
  } else {
    user.profile_pic = imageUrl || imagePath; // Update existing profile picture
  }

  await user.save();

  return res.status(200).json({
    success: true,
    message: user.profile_pic ? 'Profile picture updated successfully' : 'Profile picture added successfully',
    profile_pic: user.profile_pic,
  });
});



//Route to fetch location


//Route to get post using postid
export const getPostById = catchAsync(async (req, res) => {
  const { postId } = req.params;

  // Find post by ID
  const post = await Post.findById(postId); // Optional: populate related fields

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found',
    });
  }

  res.status(200).json({
    success: true,
    post,
  });
});

export const followers = catchAsync(async (req, res) => {
  const { id } = req.body;
  const currentUserId = req.user._id;  // Assuming current user is set from authentication middleware
  
  // Check if the id is provided
  if (!id) {
    return res.status(404).json({
      success: false,
      message: 'User ID not found',
    });
  }

  // Find the target user
  const targetUser = await User.findById(id);
  const currentUser = await User.findById(currentUserId);

  // Check if the target user exists
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'Target user not found',
    });
  }

  // Prevent the user from following themselves
  if (currentUserId.toString() === id.toString()) {
    return res.status(400).json({
      success: false,
      message: "You can't follow yourself.",
    });
  }

  // Prevent duplicate follow
  if (targetUser.followers.includes(currentUserId)) {
    return res.status(400).json({
      success: false,
      message: 'You are already following this user.',
    });
  }

  // Add the current user to the target user's followers and the target user to the current user's following
  targetUser.followers.push(currentUserId);
  currentUser.following.push(id);

  // Save both users
  await targetUser.save();
  await currentUser.save();

  res.status(200).json({
    success: true,
    message: `You are now following ${targetUser.username}`,
  });
});

//Route to unfollow
export const unfollow = catchAsync(async (req, res) => {
  const { id } = req.body;
  const currentUserId = req.user._id;  // Assuming current user is set from authentication middleware
  
  // Check if the id is provided
  if (!id) {
    return res.status(404).json({
      success: false,
      message: 'User ID not found',
    });
  }

  // Find the target user and the current user
  const targetUser = await User.findById(id);
  const currentUser = await User.findById(currentUserId);

  // Check if the target user exists
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'Target user not found',
    });
  }

  // Prevent the user from unfollowing themselves
  if (currentUserId.toString() === id.toString()) {
    return res.status(400).json({
      success: false,
      message: "You can't unfollow yourself.",
    });
  }

  // Check if the user is following the target user
  if (!targetUser.followers.includes(currentUserId)) {
    return res.status(400).json({
      success: false,
      message: 'You are not following this user.',
    });
  }

  // Remove the current user from the target user's followers and the target user from the current user's following
  targetUser.followers.pull(currentUserId);
  currentUser.following.pull(id);

  // Save both users
  await targetUser.save();
  await currentUser.save();

  res.status(200).json({
    success: true,
    message: `You have unfollowed ${targetUser.username}`,
  });
});

//Route to add like a vibe
export const likeVibe = catchAsync(async (req, res) => {
  const { vibeId } = req.body;  // Only the vibeId is required to like the vibe
  const currentUserId = req.user._id;  // Assuming the current user is set from authentication middleware
  
  // Check if vibeId is provided
  if (!vibeId) {
    return res.status(400).json({
      success: false,
      message: 'Vibe ID is required',
    });
  }

  // Find the vibe
  const vibe = await Vibe.findById(vibeId);
  
  // Check if the vibe exists
  if (!vibe) {
    return res.status(404).json({
      success: false,
      message: 'Vibe not found',
    });
  }

  // Check if the current user has already liked the vibe
  if (vibe.likes.includes(currentUserId)) {
    return res.status(400).json({
      success: false,
      message: 'You have already liked this vibe',
    });
  }

  // Add the current user's ID to the likes array
  vibe.likes.push(currentUserId);
  
  // Save the vibe with the updated likes
  await vibe.save();

  res.status(200).json({
    success: true,
    message: 'You have liked this vibe',
  });
});

//Route to unlike
export const unlikeVibe = catchAsync(async (req, res) => {
  const { vibeId } = req.body;  // Only the vibeId is required to unlike the vibe
  const currentUserId = req.user._id;  // Assuming the current user is set from authentication middleware
  
  // Check if vibeId is provided
  if (!vibeId) {
    return res.status(400).json({
      success: false,
      message: 'Vibe ID is required',
    });
  }

  // Find the vibe
  const vibe = await Vibe.findById(vibeId);
  
  // Check if the vibe exists
  if (!vibe) {
    return res.status(404).json({
      success: false,
      message: 'Vibe not found',
    });
  }

  // Check if the current user has already liked the vibe
  if (!vibe.likes.includes(currentUserId)) {
    return res.status(400).json({
      success: false,
      message: 'You have not liked this vibe yet',
    });
  }

  // Remove the current user's ID from the likes array
  vibe.likes = vibe.likes.filter(userId => userId.toString() !== currentUserId.toString());
  
  // Save the vibe with the updated likes
  await vibe.save();

  res.status(200).json({
    success: true,
    message: 'You have unliked this vibe',
  });
});


//Route to get all posts through useri

export const getPostsByUserId = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const posts = await Post.find({
    user: new mongoose.Types.ObjectId(userId),
  });

  res.status(200).json({
    success: true,
    count: posts.length,
    posts,
  });
});

export const getVibesByUserId = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const vibes = await Vibe.find({
    user: new mongoose.Types.ObjectId(userId),
  });

  res.status(200).json({
    success: true,
    count: vibes.length,
    vibes,
  });
});

//Route to get maximum postid
export const getPostIdsWithMostVibes = catchAsync(async (req, res) => {
  const postVibesCount = await Vibe.aggregate([
    {
      $match: { post: { $ne: null } } // Filter out null post (since it's called `post`, not `postId`)
    },
    {
      $group: {
        _id: "$post", // Group by post (not postId)
        vibeCount: { $sum: 1 }, // Count the number of vibes for each post
      },
    },
    {
      $sort: { vibeCount: -1 }, // Sort in descending order based on vibeCount
    },
    {
      $project: {
        _id: 0, // Remove _id from result
        postId: "$_id", // Rename _id to postId
        vibeCount: 1, // Include vibeCount
      },
    },
  ]);

  res.status(200).json({
    success: true,
    count: postVibesCount.length,
    postVibesCount,
  });
});


//Route for favoirate
export const favoritePost = catchAsync(async (req, res) => {
  const { postId } = req.body;
  const currentUserId = req.user._id;

  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'Post ID is required',
    });
  }

  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found',
    });
  }

  // Check if already favorited
  const existingFavorite = await Favorite.findOne({
    userId: currentUserId,
    postId,
  });

  if (existingFavorite) {
    return res.status(400).json({
      success: false,
      message: 'You have already favorited this post',
    });
  }

  // Create a new favorite entry
  await Favorite.create({
    userId: currentUserId,
    postId,
  });

  res.status(200).json({
    success: true,
    message: 'Post added to your favorites',
  });
});


//Route for unfavorite
export const unfavoritePost = catchAsync(async (req, res) => {
  const { postId } = req.body;
  const currentUserId = req.user._id;

  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'Post ID is required',
    });
  }

  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found',
    });
  }

  // Check if favorite exists
  const existingFavorite = await Favorite.findOne({
    userId: currentUserId,
    postId,
  });

  if (!existingFavorite) {
    return res.status(400).json({
      success: false,
      message: 'This post is not in your favorites',
    });
  }

  // Remove the favorite entry
  await Favorite.deleteOne({
    userId: currentUserId,
    postId,
  });

  res.status(200).json({
    success: true,
    message: 'Post removed from your favorites',
  });
});



//route to set area
export const setArea = async (req, res) => {
  const userId = req.user._id;
  const { area, latitude, longitude, city, state, country } = req.body;

  // Validate input
  if (!area || !latitude || !longitude || !city || !state || !country) {
    return res.status(400).json({ error: 'All location fields are required.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Save location fields directly on the user
    user.area = area;
    user.latitude = latitude;
    user.longitude = longitude;
    user.city = city;
    user.state = state;
    user.country = country;

    await user.save();

    res.json({
      message: `Location saved successfully. Area: ${area}, City: ${city}, State: ${state}, Country: ${country}, Latitude: ${latitude}, Longitude: ${longitude}`
    });
  } catch (err) {
    console.error('Error saving location:', err);
    res.status(500).json({ error: 'Server error while saving location.' });
  }
};


//Route to set accunt info
// controllers/userController.js

export const setAccountInfo = async (req, res) => {
  const userId = req.user._id;
  let { accountType, professionType, profession } = req.body;

  // If accountType is not provided, default to 'Personal'
  if (!accountType) {
    accountType = 'Personal';
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.accountType = accountType;
    user.professionType = professionType || null;
    user.profession = profession || null;

    await user.save();

    res.json({
      message: 'Account information updated successfully.',
      accountType: user.accountType,
      professionType: user.professionType,
      profession: user.profession
    });
  } catch (err) {
    console.error('Error updating account info:', err);
    res.status(500).json({ error: 'Server error while updating account info.' });
  }
};


//Route to check favorite post

export const checkFavoriteStatus = catchAsync(async (req, res) => {
  const { postId } = req.body;
  const currentUserId = req.user._id;

  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'Post ID is required',
    });
  }

  // Cast to ObjectId to avoid type mismatch
  const isFavorited = await Favorite.findOne({
    userId: new mongoose.Types.ObjectId(currentUserId),
    postId: new mongoose.Types.ObjectId(postId),
  });

  res.status(200).json({
    success: true,
    favorited: !!isFavorited,
    message: isFavorited
      ? 'User has favorited this post'
      : 'User has not favorited this post',
  });
});


export const createConnection = async (req, res) => {
  try {
    const { postId, text, topic, connectedTo, price } = req.body;
    const connectedFrom = req.user._id;

    if (!postId || !connectedTo || !topic) {
      return res.status(400).json({
        success: false,
        message: 'postId, connectedTo, and topic are required',
      });
    }

    const existingConnection = await Connection.findOne({
      connectedTo,
      connectedFrom,
      postId,
    });

    if (existingConnection) {
      return res.status(409).json({
        success: false,
        message: 'Connection already exists',
      });
    }

    const newConnection = await Connection.create({
      connectedTo,
      connectedFrom,
      postId,
      text,
      topic,
      price, // <-- added here
    });

    res.status(201).json({
      success: true,
      message: 'Connection created successfully',
      data: newConnection,
    });
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating connection',
    });
  }
};


//To check connection
export const checkConnection = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const currentUserId = req.user._id;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: 'otherUserId is required',
      });
    }

    const connection = await Connection.findOne({
      $or: [
        { connectedFrom: currentUserId, connectedTo: otherUserId },
        { connectedFrom: otherUserId, connectedTo: currentUserId },
      ],
    });

    return res.status(200).json({
      success: true,
      isConnected: !!connection,
    });

  } catch (error) {
    console.error('Error checking connection:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking connection',
    });
  }
};

//Route to get connected To
export const getUserConnections = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required in request body',
      });
    }

    const connections = await Connection.find({ connectedTo: userId })
      .sort({ createdAt: -1 })
      .select('_id connectedTo postId connectedFrom text topic createdAt __v');

    return res.status(200).json({
      success: true,
      connections,
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching connections',
    });
  }
};



export const getUserConnection_from = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required in request body',
      });
    }

    const connections = await Connection.find({ connectedFrom: userId })
      .sort({ createdAt: -1 })
      .select('_id connectedTo postId connectedFrom text topic createdAt __v'); // select only these fields

    return res.status(200).json({
      success: true,
      connections,
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching connections',
    });
  }
};



export const sendOTP_email = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required',
    });
  }

  // Check if email is already registered
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email is already registered',
    });
  }

  try {
    await sendOtpToEmail(email);
    res.json({
      success: true,
      message: 'OTP sent to email successfully',
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
    });
  }
});

//route to register through otp

export const register_email = catchAsync(async (req, res) => {
  const { email, otp, userData } = req.body;

  if (!email || !otp || !userData) {
    return res.status(400).json({
      success: false,
      message: 'Email, OTP, and user data are required'
    });
  }

  const result = verifyOtp(email, otp);
  if (!result.success) {
    return res.status(401).json({
      success: false,
      message: result.message
    });
  }

  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered'
    });
  }

  const newUser = await User.create({
    username: userData.username,
    password: userData.password,  // यहाँ password plain ही रहेगा
    email: userData.email,
    name: userData.name,
  });

  const token = await newUser.generateAuthToken();

  res.json({
    success: true,
    message: 'Registration successful',
    userId: newUser._id,
    token
  });
});

//To create report
export const addPostReport = catchAsync(async (req, res) => {
  const { postId, text } = req.body;

  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User information missing',
    });
  }

  const userId = req.user._id;

  // Validate input
  if (!text || !postId) {
    return res.status(400).json({
      success: false,
      message: 'Text and postId are required',
    });
  }

  // Check if post exists
  const postExists = await Post.findById(postId);
  if (!postExists) {
    return res.status(404).json({
      success: false,
      message: 'Post not found',
    });
  }

  // Create new report document
  const report = await Report.create({
    post: postId,
    user: userId,
    text,
    reportedAt: new Date(),
  });

  res.status(201).json({
    success: true,
    message: 'Report created and linked to post successfully',
    report,
  });
});

export const addViveReport = catchAsync(async (req, res) => {
  const { vibeId, text } = req.body;

  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User information missing',
    });
  }

  const userId = req.user._id;

  // Validate input
  if (!text || !vibeId) {
    return res.status(400).json({
      success: false,
      message: 'Text and vibeId are required',
    });
  }

  // Check if Vibe exists
  const vibeExists = await Vibe.findById(vibeId);
  if (!vibeExists) {
    return res.status(404).json({
      success: false,
      message: 'Vibe not found',
    });
  }

  // Create report
  const report = await Report.create({
    vibe: vibeId,  // ✅ Fixed key
    user: userId,
    text,
    reportedAt: new Date(),
  });

  res.status(201).json({
    success: true,
    message: 'Report created and linked to vibe successfully',
    report,
  });
});



export const updateProfessionalInfo = async (req, res) => {
  const userId = req.user._id;
  const { professionType, profession } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const cleanedType = (user.accountType || '').toLowerCase().trim();

    if (cleanedType !== 'professional') {
      return res.status(403).json({
        message: 'Only Professional accounts can update profession details.',
      });
    }

    user.professionType = professionType || user.professionType;
    user.profession = profession || user.profession;

    await user.save();

    return res.status(200).json({
      message: 'Profession details updated successfully.',
      professionType: user.professionType,
      profession: user.profession,
    });
  } catch (err) {
    console.error('Error updating profession details:', err);
    res.status(500).json({ error: 'Server error while updating profession details.' });
  }
};


export const addFeedback = async (req, res) => {
  try {
    const userId = req.user._id;  // current user from auth middleware
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Feedback text is required.' });
    }

    const feedback = new Feedback({
      user_id: userId,  // <-- must match schema field exactly
      text,
      timestamp: new Date(),
    });

    await feedback.save();

    res.status(201).json({ message: 'Feedback added successfully.', feedback });
  } catch (err) {
    console.error('Error adding feedback:', err);
    res.status(500).json({ error: 'Server error while adding feedback.' });
  }
};


export const getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find(); // No .populate()
    res.status(200).json({ feedbacks });
  } catch (err) {
    console.error('Error fetching feedbacks:', err);
    res.status(500).json({ error: 'Server error while fetching feedbacks.' });
  }
};

//Route to update post
export const updatePost = catchAsync(async (req, res) => {
  const { postId, userId, description, price } = req.body;

  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid postId or userId format",
    });
  }

  // Find the post with matching postId and userId
  const post = await Post.findOne({
    _id: new mongoose.Types.ObjectId(postId),
    user: new mongoose.Types.ObjectId(userId), // adjust to your schema key, it might be `userId` or `owner`
  });

  if (!post) {
    return res.status(404).json({
      success: false,
      message: "Post not found or you are not authorized to update it",
    });
  }

  // Update allowed fields
  if (description) post.description = description;
  if (price) post.price = price;

  await post.save();

  res.status(200).json({
    success: true,
    message: "Post updated successfully",
    post,
  });
});


export const updatePasswordWithOldPassword = catchAsync(async (req, res) => {
  const { email, oldPassword, newPassword, confirmNewPassword } = req.body;

  if (!email || !oldPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({
      success: false,
      message: 'Email, old password, new password, and confirm password are required',
    });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({
      success: false,
      message: 'New password and confirm password do not match',
    });
  }

  const user = await User.findOne({ email }).select('+password'); // Ensure password is selected

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  const isMatch = await user.comparePassword(oldPassword);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Old password is incorrect',
    });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
  });
});



//Route to update password through email_otp
export const updatePasswordWithEmailOtp = catchAsync(async (req, res) => {
  const { email, otp, userData } = req.body;

  if (
    !email ||
    !otp ||
    !userData ||
    !userData.password ||
    !userData.confirmPassword
  ) {
    return res.status(400).json({
      success: false,
      message: 'Email, OTP, password, and confirm password are required',
    });
  }

  if (userData.password !== userData.confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Password and confirm password do not match',
    });
  }

  // Use the verifyOtp function you already have
  const verification = await verifyOtp(email, otp);

  if (!verification || !verification.success) {
    return res.status(401).json({
      success: false,
      message: verification?.message || 'Invalid or expired OTP',
    });
  }

  const existingUser = await User.findOne({ email });

  if (!existingUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Set new password and save
  existingUser.password = userData.password;
  await existingUser.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
  });
});

export const getVibeAndAllByPostId = catchAsync(async (req, res) => {
  const { postId, vibeId } = req.body;

  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'postId is required',
    });
  }

  const postExists = await Post.findById(postId);
  if (!postExists) {
    return res.status(404).json({
      success: false,
      message: 'Post not found',
    });
  }

  let specificVibe = null;
  if (vibeId) {
    specificVibe = await Vibe.findOne({ _id: vibeId, post: postId }).populate('user', 'name email');
  }

  const allVibes = await Vibe.find({ post: postId }).populate('user', 'name email');

  if (!specificVibe && vibeId) {
    return res.status(200).json({
      success: true,
      message: 'Vibe not found, returning all vibes for the post',
      count: allVibes.length,
      vibes: allVibes,
    });
  }

  return res.status(200).json({
    success: true,
    message: specificVibe ? 'Specific vibe found and returning all vibes' : 'Returning all vibes for the post',
    specificVibe,
    allVibes,
    count: allVibes.length,
  });
});



export const sendWhatsAppOtp = catchAsync(async (req, res) => {
  let { mobileNumber } = req.body;

  if (!mobileNumber) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number is required',
    });
  }

  // Accept plain 10-digit number only
  const cleanedNumber = mobileNumber.replace(/\D/g, '');
  if (cleanedNumber.length !== 10) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number must be 10 digits',
    });
  }

  // Send only 10-digit number because countryCode=91 is in the URL
  const formattedNumber = cleanedNumber;

  const url = `${process.env.MESSAGECENTRAL_BASE_URL}?countryCode=91&customerId=${process.env.MESSAGECENTRAL_CUSTOMER_ID}&flowType=WHATSAPP&mobileNumber=${formattedNumber}`;
  
  try {
    const response = await axios.post(url, null, {
      headers: {
        authToken: process.env.MESSAGECENTRAL_AUTH_TOKEN,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully via WhatsApp',
      data: response.data,
    });
  } catch (error) {
    console.error('OTP sending failed:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.response?.data || error.message,
    });
  }
});




export const verifyWhatsAppOtp = catchAsync(async (req, res) => {
  let { mobileNumber, verificationId, code } = req.body;

  if (!mobileNumber || !verificationId || !code) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number, verificationId, and code are required',
    });
  }

  const cleanedNumber = mobileNumber.replace(/\D/g, '');
  if (cleanedNumber.length !== 10) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number must be 10 digits',
    });
  }

  // ✅ Format with +91 before sending to provider and saving to DB
  const formattedNumber = `+91${cleanedNumber}`;

  const url = `${process.env.MESSAGECENTRAL_VALIDATE_URL}?countryCode=91&mobileNumber=${formattedNumber}&verificationId=${verificationId}&customerId=${process.env.MESSAGECENTRAL_CUSTOMER_ID}&code=${code}`;

  try {
    const response = await axios.get(url, {
      headers: {
        authToken: process.env.MESSAGECENTRAL_AUTH_TOKEN,
      },
    });

    // ✅ Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User not logged in',
      });
    }

    // ✅ Save as +91XXXXXXXXXX
    await User.findByIdAndUpdate(req.user._id, { phoneNumber: formattedNumber });

    return res.status(200).json({
      success: true,
      message: 'OTP verified and phone number updated successfully',
      data: response.data,
    });
  } catch (error) {
    console.error('OTP verification failed:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.response?.data || error.message,
    });
  }
});


