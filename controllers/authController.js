import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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
import Referral from '../models/referral.js';
import Spotlite from '../models/Spotlite.js';
import crypto from 'crypto'; // 
import { v4 as uuidv4 } from 'uuid';
import csv from 'csv-parser';
import fs from 'fs';
import moment from 'moment';
import LaunchPad from '../models/LaunchPad.js';
// At the top of your authController.js
import Otp from '../models/Otp.js'; // adjust the path if needed
// import crypto from "crypto";
import Wallet from '../models/Wallet.js';
import Transaction from "../models/Transactions.js";
import LoyaltyCard from "../models/Loyalty.js";
import Kyc from "../models/kyc.js";
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
      message: 'Unauthorized: User not found in request',
    });
  }

  const userId = req.user._id;

  if (!text || !postId) {
    return res.status(400).json({
      success: false,
      message: 'Both text and postId are required.',
    });
  }

  const postExists = await Post.findById(postId);
  if (!postExists) {
    return res.status(404).json({
      success: false,
      message: 'The post with the given ID was not found.',
    });
  }

  // Always create a new vibe (no time or frequency limit)
  const newVibe = await Vibe.create({
    images,
    rating,
    text,
    imagePath,
    user: userId,
    post: postId,
    topic,
    vibeType,
  });

  res.status(201).json({
    success: true,
    message: 'New vibe created successfully.',
    vibe: newVibe,
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
  const { bio, name } = req.body; // ✅ Changed 'Bio' to 'bio'

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
  if (bio) user.bio = bio;       // ✅ Corrected field update
  if (name) user.name = name;

  await user.save();

  // 4. Send back updated info
  res.status(200).json({
    success: true,
    message: 'User profile updated successfully',
    user: {
      _id: user._id,
      username: user.username,
      name: user.name,
      bio: user.bio  // ✅ Ensure it matches schema
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
  const posts = await Post.find().sort({ createdAt: -1 }); // Sort by newest first

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


// 🔧 Utility to generate unique 8-character referral code
const generateReferralCode = async () => {
  let code;
  let exists = true;

  while (exists) {
    code = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
    const existing = await Referral.findOne({ referralCode: code });
    exists = !!existing;
  }

  return code;
};

export const addReferral = catchAsync(async (req, res) => {
  const { coin } = req.body;

  // ✅ Ensure user is logged in
  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User not logged in',
    });
  }

  try {
    // ✅ Check if referral already exists for this user
    const existingReferral = await Referral.findOne({ userId: req.user._id });

    if (existingReferral) {
      // ✅ Return existing referral
      return res.status(200).json({
        success: true,
        message: 'Referral already exists',
        data: existingReferral,
      });
    }

    // ✅ Generate a unique referral code
    const referralCode = await generateReferralCode();

    // ✅ Create referral
    const newReferral = await Referral.create({
      referralCode,
      coin: coin ?? 0,
      userId: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Referral added successfully',
      data: newReferral,
    });
  } catch (error) {
    console.error('Error adding referral:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to add referral',
      error: error.message,
    });
  }
});


export const checkReferralCode = catchAsync(async (req, res) => {
  const { referralCode } = req.body;

  if (!referralCode) {
    return res.status(400).json({
      success: false,
      message: 'Referral code is required',
    });
  }

  const existingReferral = await Referral.findOne({ referralCode });

  return res.status(200).json({
    success: true,
    exists: !!existingReferral,
  });
});

//Login with email
export const loginWithEmail = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'No user found with that email'
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


export const applyReferralCode = catchAsync(async (req, res) => {
  const { referralCode } = req.body;

  if (!referralCode) {
    return res.status(400).json({
      success: false,
      message: 'Referral code is required',
    });
  }

  // Find the referral entry
  const referral = await Referral.findOne({ referralCode });

  if (!referral) {
    return res.status(400).json({
      success: false,
      message: 'Invalid referral code',
    });
  }

  // Add 10 coins every time the referral code is used
  referral.coin += 10;
  await referral.save();

  res.status(200).json({
    success: true,
    message: 'Referral code matched. 10 coins added successfully.',
    referral: {
      referralCode: referral.referralCode,
      totalCoins: referral.coin,
    },
  });
});

export const getReferralByUserId = catchAsync(async (req, res) => {
  // ✅ Get userId from logged-in user (middleware should attach req.user)
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User not logged in',
    });
  }

  let referral = await Referral.findOne({ userId });

  // If referral doesn't exist, create one
  if (!referral) {
    const referralCode = uuidv4().slice(0, 8); // generate 8-char code

    referral = await Referral.create({
      userId,
      referralCode,
      coin: 0,
    });
  }

  res.status(200).json({
    success: true,
    referral: {
      referralCode: referral.referralCode,
      totalCoins: referral.coin,
    },
  });
});



export const deletePost = catchAsync(async (req, res) => {
  const { postId } = req.body;

  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User not logged in',
    });
  }

  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'postId is required',
    });
  }

  const post = await Post.findOne({ _id: postId, user: req.user._id });

  if (!post) {
    return res.status(404).json({
      success: false,
      message: 'Post not found or you are not authorized to delete it',
    });
  }

  await Post.deleteOne({ _id: postId });

  res.status(200).json({
    success: true,
    message: 'Post deleted successfully',
  });
});

export const deleteVibe = catchAsync(async (req, res) => {
  const { vibeId } = req.body;

  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User not logged in',
    });
  }

  if (!vibeId) {
    return res.status(400).json({
      success: false,
      message: 'vibeId is required',
    });
  }

  const vibe = await Vibe.findOne({ _id: vibeId, user: req.user._id });

  if (!vibe) {
    return res.status(404).json({
      success: false,
      message: 'Vibe not found or you are not authorized to delete it',
    });
  }

  await Vibe.deleteOne({ _id: vibeId });

  res.status(200).json({
    success: true,
    message: 'Vibe deleted successfully',
  });
});

export const searchByUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username query must be at least 3 characters',
      });
    }

    const users = await User.find({
      username: { $regex: new RegExp('^' + username, 'i') } // starts with input
    }).select('username name email');

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};



export const searchByPostTopic = async (req, res) => {
  try {
    const { topic } = req.query;

    if (!topic || topic.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Topic query must be at least 3 characters',
      });
    }

    const regex = new RegExp(topic, 'i'); // Match topic anywhere, case-insensitive

    const posts = await Post.find({
      topic: { $regex: regex }
    });

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while searching posts by topic',
      error: error.message,
    });
  }
};

export const sendOTP_resetPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  // Send OTP only if email exists
  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    return res.status(404).json({ success: false, message: 'Email not found' });
  }

  try {
    await sendOtpToEmail(email);
    res.json({ success: true, message: 'OTP sent to reset password' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

export const getPostsByTopicFromBody = async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic || topic.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Topic must be at least 3 characters long',
      });
    }

    const regex = new RegExp(topic, 'i');

    const posts = await Post.find(
      { topic: { $regex: regex } },
      { _id: 1, topic: 1, description: 1 }
    );

    // Rename _id to post_id in response
    const formattedPosts = posts.map(post => ({
      post_id: post._id,
      topic: post.topic,
      description: post.description,
    }));

    res.status(200).json({
      success: true,
      count: formattedPosts.length,
      data: formattedPosts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching posts',
      error: error.message,
    });
  }
};

export const updateSpotlite = catchAsync(async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'postId is required in the request body'
    });
  }

  // Check if the post exists
  const postExists = await Post.findById(postId);
  if (!postExists) {
    return res.status(404).json({
      success: false,
      message: 'Post not found'
    });
  }

  // Set all Spotlite entries to false
  await Spotlite.updateMany({}, { spotlite: false });

  // Upsert the Spotlite post to true
  const updatedSpotlite = await Spotlite.findOneAndUpdate(
    { postId },
    {
      postId,
      vibeCount: postExists.vibeCount,
      spotlite: true
    },
    { upsert: true, new: true }
  );

  res.json({
    success: true,
    message: 'Spotlite post updated successfully',
    data: updatedSpotlite
  });
});



//get vibes through userid
export const VibesByUserId = catchAsync(async (req, res) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'userIds array is required in the request body',
    });
  }

  const vibes = await Vibe.find({ user: { $in: userIds } }).populate('post');

  if (!vibes || vibes.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No vibes found for the provided userIds',
    });
  }

  res.status(200).json({
    success: true,
    count: vibes.length,
    vibes,
  });
});

export const checkSpotlite = catchAsync(async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({
      success: false,
      message: 'Post ID is required in body',
    });
  }

  const spotliteEntry = await Spotlite.findOne({ postId, spotlite: true });

  return res.status(200).json({
    success: true,
    spotlite: !!spotliteEntry,
    message: spotliteEntry ? 'Post is in spotlite' : 'Post is not in spotlite',
  });
});



// Add image/video URLs to documents[]
export const updateDocuments = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { documents } = req.body;

  if (!Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Documents must be a non-empty array of URLs',
    });
  }

  const isValidFile = url =>
    /\.(jpg|jpeg|png|webp|mp4|mov|avi)$/i.test(url);

  const invalid = documents.filter(url => !isValidFile(url));
  if (invalid.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Only image/video URLs are allowed',
      invalid,
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  user.documents.push(...documents);
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Documents added successfully',
    documents: user.documents,
  });
});

export const checkUsername = catchAsync(async (req, res) => {
  const { username } = req.body;

  if (!username || username.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Username is required",
    });
  }

  const existingUser = await User.findOne({ username: username.trim() });

  if (existingUser) {
    return res.status(200).json({
      success: false,
      message: "Username already registered",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Username is available",
  });
});

//Route to count total number of users
export const getTotalUsers = catchAsync(async (req, res) => {
  const totalUsers = await User.countDocuments();

  res.status(200).json({
    success: true,
    totalUsers,
  });
});

export const getCurrentUserDetails = catchAsync(async (req, res) => {
  // req.user is set by protect middleware
  const user = await User.findById(req.user._id).select("username bio followers following");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    user: {
      username: user.username,
      bio: user.bio,
      followers: user.followers,
      following: user.following,
      followersCount: user.followers.length,
      followingCount: user.following.length
    }
  });
});

//make admin
export const makeUserAdmin = catchAsync(async (req, res) => {
  const { userId } = req.body; // Only pass target user's id

  // The current logged-in user
  const currentUser = await User.findById(req.user._id);

  if (!currentUser || !currentUser.isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Only admins can make other users admin",
    });
  }

  // Find the target user
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: "Target user not found",
    });
  }

  // ✅ Check if target user is already an admin
  if (targetUser.isAdmin) {
    return res.status(400).json({
      success: false,
      message: `${targetUser.username} is already an admin`,
    });
  }

  // Update the target user
  targetUser.isAdmin = true;
  await targetUser.save();

  res.status(200).json({
    success: true,
    message: `${targetUser.username} is now an admin`,
    user: {
      id: targetUser._id,
      username: targetUser.username,
      isAdmin: targetUser.isAdmin,
    },
  });
});



export const forceMakeAdmin = catchAsync(async (req, res) => {
  const { userId } = req.body; // Pass target userId in request body

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Even if user never had isAdmin, Mongoose will add it now
  targetUser.isAdmin = true;
  await targetUser.save();

  res.status(200).json({
    success: true,
    message: `${targetUser.username} is now an admin (forced)`,
    user: {
      id: targetUser._id,
      username: targetUser.username,
      isAdmin: targetUser.isAdmin,
    },
  });
});


export const removeUserAdmin = catchAsync(async (req, res) => {
  const { userId } = req.body; // Target user's id

  // Get the current logged-in user
  const currentUser = await User.findById(req.user._id);

  if (!currentUser || !currentUser.isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Only admins can remove admin rights",
    });
  }

  // Find the target user
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: "Target user not found",
    });
  }

  // Remove admin role
  if (!targetUser.isAdmin) {
    return res.status(400).json({
      success: false,
      message: `${targetUser.username} is not an admin`,
    });
  }

  targetUser.isAdmin = false;
  await targetUser.save();

  res.status(200).json({
    success: true,
    message: `${targetUser.username} is no longer an admin`,
    user: {
      id: targetUser._id,
      username: targetUser.username,
      isAdmin: targetUser.isAdmin,
    },
  });
});


export const getAllKycDocuments = catchAsync(async (req, res) => {
  // ✅ Check if logged-in user is admin
  const currentUser = await User.findById(req.user._id);
  if (!currentUser || !currentUser.isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Only admins can view KYC documents",
    });
  }

  // ✅ Fetch all KYC documents where PAN is uploaded
  const kycs = await Kyc.find({ panUrl: { $exists: true, $ne: null } })
    .populate("user", "_id name email") // optional: fetch user info
    .select("-__v -updatedAt"); // remove unnecessary fields

  // ✅ Return clean response
  const kycData = kycs.map((doc) => ({
    userId: doc.user?._id,
    name: doc.user?.name || null,
    email: doc.user?.email || null,
    isKycVerified: doc.isKycVerified,
    kycStatus: doc.kycStatus,
    ownerName: doc.ownerName,
    businessName: doc.businessName,
    panNumber: doc.panNumber,
    panUrl: doc.panUrl,
    accountType: doc.accountType,
    professionType: doc.professionType,
    profession: doc.profession,
    createdAt: doc.createdAt,
  }));

  res.status(200).json({
    success: true,
    count: kycData.length,
    data: kycData,
  });
});



export const approveKycAndMakeProfessional = catchAsync(async (req, res) => {
  const adminId = req.user._id; // currently logged-in user (admin)
  const { userId } = req.body;  // target user to approve

  // ✅ Check if logged-in user is admin
  const adminUser = await User.findById(adminId);
  if (!adminUser || !adminUser.isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Only admins can approve KYC and update account type",
    });
  }

  // ✅ Find the target user's KYC record
  const kycRecord = await Kyc.findOne({ user: userId });
  if (!kycRecord) {
    return res.status(404).json({
      success: false,
      message: "KYC record not found for this user",
    });
  }

  // ✅ Update User's accountType
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }
  user.accountType = "Professional";
  await user.save();

  // ✅ Update KYC status
  kycRecord.kycStatus = "approved";
  kycRecord.isKycVerified = true;
  await kycRecord.save();

  // ✅ Update Wallet if exists
  const wallet = await Wallet.findOne({ userId });
  if (wallet) {
    wallet.walletType = "professional";
    wallet.professionalWallet = true;
    await wallet.save();
  }

  res.status(200).json({
    success: true,
    message: `User ${user.username} is now a Professional and KYC is approved`,
    data: {
      userId: userId,
      accountType: user.accountType, // ✅ from User model
      isKycVerified: kycRecord.isKycVerified,
      kycStatus: kycRecord.kycStatus,
      ownerName: kycRecord.ownerName,
      businessName: kycRecord.businessName,
      panNumber: kycRecord.panNumber,
      panUrl: kycRecord.panUrl,
      professionType: kycRecord.professionType,
      profession: kycRecord.profession,
      walletUpdated: wallet
        ? {
            walletId: wallet._id,
            walletName: wallet.walletName,
            walletType: wallet.walletType,
            professionalWallet: wallet.professionalWallet,
          }
        : null,
    },
  });
});



export const adminTakeCoins = async (req, res) => {
  try {
    const { walletName, coins } = req.body;

    // ✅ check admin by isAdmin flag
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin access only",
      });
    }

    // ✅ find the user's wallet
    const userWallet = await Wallet.findOne({ walletName });
    if (!userWallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found for this user",
      });
    }

    // ✅ check balance
    if (userWallet.totalCoin < coins) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance in user wallet",
      });
    }

    // ✅ deduct coins from user
    userWallet.totalCoin -= coins;
    await userWallet.save();

    // ✅ find admin's wallet
    const adminWallet = await Wallet.findOne({ userId: req.user._id });
    if (!adminWallet) {
      return res.status(404).json({
        success: false,
        message: "Admin wallet not found",
      });
    }

    // ✅ add coins to admin
    adminWallet.totalCoin += coins;
    await adminWallet.save();

    // ✅ log transaction for user (sentCoin)
    await Transaction.create({
      transactionType: "sentCoin",
      userId: userWallet.userId,
      coin: coins,
      fromWallet: userWallet._id,
      toWallet: adminWallet._id,
    });

    // ✅ log transaction for admin (gotCoin)
    await Transaction.create({
      transactionType: "gotCoin",
      userId: req.user._id,
      coin: coins,
      fromWallet: userWallet._id,
      toWallet: adminWallet._id,
    });

    res.json({
      success: true,
      message: `Successfully transferred ${coins} coins from "${walletName}" to admin`,
    });
  } catch (error) {
    console.error("Admin take coins error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// 🔹 Admin gives coins to any user wallet
// 🔹 Admin gives coins to any user wallet
export const adminGiveCoins = async (req, res) => {
  try {
    const { walletName, coins } = req.body;

    // ✅ Validate input
    if (!walletName || !coins || coins <= 0) {
      return res.status(400).json({
        success: false,
        message: "Wallet name and positive coin amount are required",
      });
    }

    // ✅ check admin by isAdmin flag
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin access only",
      });
    }

    // ✅ find the user's wallet
    const userWallet = await Wallet.findOne({ walletName });
    if (!userWallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found for this user",
      });
    }

    // ✅ find admin's wallet
    const adminWallet = await Wallet.findOne({ userId: req.user._id });
    if (!adminWallet) {
      return res.status(404).json({
        success: false,
        message: "Admin wallet not found",
      });
    }

    // ✅ check if admin has enough coins
    if (adminWallet.totalCoin < coins) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance in admin wallet",
      });
    }

    // ✅ perform transfer
    adminWallet.totalCoin -= coins;
    userWallet.totalCoin += coins;

    // ✅ save both wallets in parallel
    await Promise.all([adminWallet.save(), userWallet.save()]);

    // ✅ log transactions (await both to ensure saved)
    const [sentTx, gotTx] = await Promise.all([
      Transaction.create({
        transactionType: "sentCoin",
        userId: req.user._id,       // admin ID
        coin: coins,
        fromWallet: adminWallet._id,
        toWallet: userWallet._id,
      }),
      Transaction.create({
        transactionType: "gotCoin",
        userId: userWallet.userId,  // user ID
        coin: coins,
        fromWallet: adminWallet._id,
        toWallet: userWallet._id,
      }),
    ]);

    console.log("✅ Sent transaction:", sentTx._id);
    console.log("✅ Got transaction:", gotTx._id);

    res.json({
      success: true,
      message: `Successfully transferred ${coins} coins from admin to "${walletName}"`,
      data: { sentTx, gotTx },
    });
  } catch (error) {
    console.error("Admin give coins error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const setAccountInfoAndKyc = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const {
    professionType,
    profession,
    businessName,
    ownerName,
    panNumber,
    panUrl,
  } = req.body;

  let kyc = await Kyc.findOne({ user: userId });

  if (!kyc) {
    kyc = new Kyc({ user: userId });
  }

  if (professionType !== undefined) kyc.professionType = professionType;
  if (profession !== undefined) kyc.profession = profession;

  if (businessName && ownerName && panNumber && panUrl) {
    kyc.kycStatus = "pending";
    kyc.isKycVerified = false;
    kyc.ownerName = ownerName;
    kyc.businessName = businessName;
    kyc.panNumber = panNumber;
    kyc.panUrl = panUrl;
  }

  await kyc.save();

  res.status(200).json({
    success: true,
    message: "Account info and KYC details updated successfully.",
    kyc,
  });
});



//Route to seach a wallet

export const searchWalletByName = catchAsync(async (req, res) => {
  const adminId = req.user._id;

  // ✅ Check admin
  const adminUser = await User.findById(adminId);
  if (!adminUser || !adminUser.isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Only admins can search wallets",
    });
  }

  const { name } = req.query;
  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Please provide a wallet name to search",
    });
  }

  // ✅ Normalize input (remove spaces, lowercase)
  const normalizedSearch = name.replace(/\s+/g, "").toLowerCase();

  // ✅ Search wallets by normalized name
  const wallets = await Wallet.find().select("walletName totalCoin _id");
  const matchedWallets = wallets.filter((w) =>
    w.walletName.replace(/\s+/g, "").toLowerCase().includes(normalizedSearch)
  );

  if (!matchedWallets.length) {
    return res.status(404).json({
      success: false,
      message: "No wallets found matching this name",
    });
  }

  res.status(200).json({
    success: true,
    count: matchedWallets.length,
    data: matchedWallets,
  });
});



export const fetchAllAdmins = catchAsync(async (req, res) => {
  const adminId = req.user._id;

  // ✅ Check if logged-in user is admin
  const adminUser = await User.findById(adminId);
  if (!adminUser || !adminUser.isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Only admins can fetch the list of admins",
    });
  }

  // ✅ Fetch all admins (only id + name/email if needed)
  const admins = await User.find({ isAdmin: true }).select("_id username email name");

  if (!admins.length) {
    return res.status(404).json({
      success: false,
      message: "No admin users found",
    });
  }

  res.status(200).json({
    success: true,
    count: admins.length,
    data: admins,
  });
});


export const fetchKycDetails = catchAsync(async (req, res) => {
  const userId = req.user._id; // ✅ logged-in user

  // ✅ Find KYC details for this user
  const kyc = await Kyc.findOne({ user: userId }).select(
    "kycStatus isKycVerified ownerName businessName panNumber panUrl professionType profession createdAt updatedAt"
  );

  if (!kyc) {
    return res.status(200).json({
      success: true,
      message: "KYC not submitted",
      data: null,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Fetched KYC details",
    data: kyc,
  });
});

