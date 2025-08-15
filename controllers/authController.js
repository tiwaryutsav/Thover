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






export const submitLaunchPadForm = catchAsync(async (req, res) => {
  const {
    startupName,
    founderName,
    industry,
    startupIdea,
    uniqueSellingPoint,
    email,
    whatsappNumber,
    payment,
    userId,    // Optional
    location   // ✅ New field
  } = req.body;

  // Validate required fields
  if (
    !startupName ||
    !founderName ||
    !industry ||
    !startupIdea ||
    !uniqueSellingPoint ||
    !email ||
    !whatsappNumber ||
    !location // ✅ location is required now
  ) {
    return res.status(400).json({
      success: false,
      message: 'All required fields must be filled, including location.'
    });
  }

  // Validate word count
  const wordCount = startupIdea.trim().split(/\s+/).length;
  if (wordCount < 10) {
    return res.status(400).json({
      success: false,
      message: 'Startup idea must be at least 10 words.'
    });
  }

  const entry = await LaunchPad.create({
    startupName,
    founderName,
    industry,
    startupIdea,
    uniqueSellingPoint,
    email,
    whatsappNumber,
    location, // ✅ Save location
    payment: payment ?? false,
    userId: userId ?? null
  });

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully.',
    data: {
      id: entry._id,
      startupName: entry.startupName,
      founderName: entry.founderName,
      status: entry.status
    }
  });
});



export const getAllLaunchPads = catchAsync(async (req, res) => {
  const launchPads = await LaunchPad.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: launchPads,
  });
});



export const createWallet = catchAsync(async (req, res) => {
  const { walletName } = req.body;

  if (!walletName) {
    return res.status(400).json({
      success: false,
      message: 'walletName is required'
    });
  }

  const isLoggedIn = !!req.user; // true if token was valid & user found

  // If logged in, check if wallet already exists for this user
  if (isLoggedIn) {
    const existingWallet = await Wallet.findOne({ userId: req.user._id });
    if (existingWallet) {
      return res.status(400).json({
        success: false,
        message: 'User already has a wallet',
        data: existingWallet
      });
    }
  }

  const wallet = await Wallet.create({
    walletName,
    userId: isLoggedIn ? req.user._id : null, // null for guests
    isGuest: !isLoggedIn, // true if guest
    walletType: 'personal', // default type
    professionalWallet: false
  });

  res.status(201).json({
    success: true,
    data: wallet
  });
});



function generate12DigitReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const generate12DigitCodesController = catchAsync(async (req, res) => {
  const isLoggedIn = !!req.user;
  const userId = isLoggedIn ? req.user._id : null;

  let wallet = await Wallet.findOne({ userId: userId, isGuest: !isLoggedIn });

  // Create wallet if not found
  if (!wallet) {
    wallet = await Wallet.create({
      walletName: isLoggedIn ? 'User Wallet' : 'Guest Wallet',
      userId: userId,
      isGuest: !isLoggedIn,
      walletType: 'personal',
      professionalWallet: false,
      redeemCode: {}, // empty map
      usedCode: {}
    });
  }

  // Ensure redeemCode is always a Map
  if (!(wallet.redeemCode instanceof Map)) {
    wallet.redeemCode = new Map(Object.entries(wallet.redeemCode || {}));
  }

  const codesToGenerate = isLoggedIn ? 5 : 1;

  // Find current highest index
  let currentIndexes = Array.from(wallet.redeemCode.keys())
    .map(k => parseInt(k))
    .filter(n => !isNaN(n));

  let startIndex = currentIndexes.length > 0 ? Math.max(...currentIndexes) + 1 : 0;

  // Add new codes
  for (let i = 0; i < codesToGenerate; i++) {
    const newCode = generate12DigitReferralCode();
    wallet.redeemCode.set(String(startIndex + i), newCode);
  }

  await wallet.save();

  res.status(200).json({
    success: true,
    message: `${codesToGenerate} 12-digit referral code(s) generated.`,
    redeemCodes: Array.from(wallet.redeemCode.values())
  });
});


export const submitKycDetails = catchAsync(async (req, res) => {
  const userId = req.user._id; // logged-in user id
  const { kyc_documents } = req.body; // array of objects

  // Validate that kyc_documents is a non-empty array
  if (!Array.isArray(kyc_documents) || kyc_documents.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'KYC documents are required and must be a non-empty array',
    });
  }

  // Update user's KYC details
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        'kyc_details.kycStatus': 'pending',
        'kyc_details.kyc_documents': kyc_documents, // store as array
      },
    },
    { new: true, runValidators: true }
  ).select('-password');

  if (!updatedUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'KYC details submitted successfully. Status is now pending.',
    data: updatedUser.kyc_details,
  });
});



export const reviewKyc = catchAsync(async (req, res) => {
  const { userId, action } = req.body; // action: 'approve' or 'reject'

  if (!userId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Please provide valid 'userId' and 'action' ('approve' or 'reject')"
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (action === 'approve') {
    user.kyc_details.kycStatus = 'approved';
    user.isKycVerified = true;
    await user.save();

    // Update wallet type to professional
    const wallet = await Wallet.findOne({ userId: user._id });
    if (wallet) {
      wallet.walletType = 'professional';
      wallet.professionalWallet = true;
      await wallet.save();
    }
  } else {
    // reject
    user.kyc_details.kycStatus = 'rejected';
    user.isKycVerified = false;
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: `KYC ${action}d successfully`,
    data: {
      kycStatus: user.kyc_details.kycStatus,
      isKycVerified: user.isKycVerified
    }
  });
});


export const buyCoin = async (req, res) => {
  try {
    const { walletId, coins } = req.body; // coins = number of coins user wants to buy
    let wallet;

    // 1️⃣ Logged-in user (token available)
    if (req.user && req.user._id) {
      wallet = await Wallet.findOne({ userId: req.user._id });
      if (!wallet) {
        return res.status(404).json({ success: false, message: "Wallet not found for logged-in user" });
      }
    }
    // 2️⃣ Guest user (walletId must be passed)
    else {
      if (!walletId) {
        return res.status(400).json({ success: false, message: "Wallet ID is required for guest purchase" });
      }
      wallet = await Wallet.findById(walletId);
      if (!wallet) {
        return res.status(404).json({ success: false, message: "Wallet not found for guest user" });
      }
    }

    // 3️⃣ Calculate amount spent (with 5% surcharge for guests)
    let amountSpent = coins;
    if (wallet.isGuest) {
      amountSpent = parseFloat((coins * 1.05).toFixed(2)); // 5% extra cost for guests
    }

    // 4️⃣ Add coins to wallet
    wallet.totalCoin += coins;
    await wallet.save();

    // 5️⃣ Record transaction
    const transaction = await Transaction.create({
      userId: req.user ? req.user._id : null, // null for guest
      transactionType: "buyCoin",
      toWallet: wallet._id,
      coin: coins, // ✅ number of coins bought
      amount: amountSpent, // ✅ money spent
    });

    res.status(200).json({
      success: true,
      message: "Coins purchased successfully",
      coinsAdded: coins,
      amountSpent,
      wallet,
      transaction,
    });

  } catch (error) {
    console.error("Buy coin error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const sellCoins = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "Unauthorized: Please login to sell coins" });
    }

    const { accountNumber, coins } = req.body;

    if (!accountNumber) {
      return res.status(400).json({ success: false, message: "Account number is required" });
    }

    if (!coins) {
      return res.status(400).json({ success: false, message: "Number of coins to sell is required" });
    }

    // Find wallet by userId only (ignoring accountNumber)
    const wallet = await Wallet.findOne({ userId: req.user._id });

    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found for this user" });
    }

    if (wallet.totalCoin < coins) {
      return res.status(400).json({ success: false, message: "Insufficient coins to sell" });
    }

    // You can optionally verify accountNumber matches wallet.accountNumber here if needed
    // e.g. if (wallet.accountNumber !== accountNumber) { ... }

    // Deduct coins from wallet
    wallet.totalCoin -= coins;
    await wallet.save();

    // Record transaction
    const transaction = await Transaction.create({
      userId: req.user._id,
      transactionType: "sellCoin",
      fromWallet: wallet._id,
      coin: coins,
      amount: coins,
      createdAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Coins sold successfully",
      coinsSold: coins,
      amountReceived: coins,
      wallet,
      transaction,
    });

  } catch (error) {
    console.error("Sell coins error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const transferCoins = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "Unauthorized: Please login to transfer coins" });
    }

    const { toWalletId, coins, redeemCode } = req.body;

    if (!toWalletId || !coins || !redeemCode) {
      return res.status(400).json({ success: false, message: "toWalletId, coins, and redeemCode are required" });
    }

    // Sender's personal wallet
    const fromWallet = await Wallet.findOne({ userId: req.user._id, walletType: 'personal' });
    if (!fromWallet) {
      return res.status(404).json({ success: false, message: "Sender personal wallet not found" });
    }

    if (fromWallet.totalCoin < coins) {
      return res.status(400).json({ success: false, message: "Insufficient coins to transfer" });
    }

    // Recipient's wallet using wallet ID
    const toWallet = await Wallet.findById(toWalletId);
    if (!toWallet) {
      return res.status(404).json({ success: false, message: "Recipient wallet not found" });
    }

    // Transfer coins
    fromWallet.totalCoin -= coins;
    toWallet.totalCoin += coins;

    await fromWallet.save();
    await toWallet.save();

    // Save redeem code in sender wallet
    const redeemIndex = Object.keys(fromWallet.redeemCode || {}).length.toString();
    fromWallet.redeemCode.set(redeemIndex, redeemCode);
    fromWallet.usedCode.set(redeemIndex, redeemCode);
    await fromWallet.save();

    // Record transaction
    const transaction = await Transaction.create({
      userId: req.user._id,
      transactionType: "TPWallet",
      fromWallet: fromWallet._id,
      toWallet: toWallet._id,
      redeemCode,
      coin: coins,
      createdAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Coins transferred successfully",
      coinsTransferred: coins,
      fromWallet,
      toWallet,
      transaction,
    });

  } catch (error) {
    console.error("Transfer coins error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


function generateCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
export const createLoyaltyCard = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Please login to create loyalty card"
      });
    }

    const { codeValue, expiry } = req.body;

    if (codeValue == null) {
      return res.status(400).json({
        success: false,
        message: "codeValue is required"
      });
    }

    if (expiry == null || typeof expiry !== "number" || expiry <= 0) {
      return res.status(400).json({
        success: false,
        message: "expiry (in months) is required and must be a positive number"
      });
    }

    // Calculate expiryDate
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + expiry);

    // Find user's personal wallet
    const wallet = await Wallet.findOne({
      userId: req.user._id,
      walletType: "personal"
    });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found for user"
      });
    }

    if (wallet.totalCoin < codeValue) {
      return res.status(400).json({
        success: false,
        message: "Insufficient coins in wallet"
      });
    }

    // Deduct coins
    wallet.totalCoin -= codeValue;
    await wallet.save();

    // Generate a single loyalty code (string)
    const loyaltyCode = generateCode(8); // e.g. "AB12CD34"

    // Create loyalty card
    const loyaltyCard = await LoyaltyCard.create({
      walletId: wallet._id,
      userId: req.user._id,
      codeValue,
      isPrivateUse: true,
      loyaltyCode, // plain string
      isCodeUsed: false,
      expiryDate
    });

    // Create transaction
    const transaction = await Transaction.create({
      transactionType: "buyLoyaltyCard",
      fromWallet: wallet._id,
      userId: req.user._id,
      toLoyaltyCard: loyaltyCard._id,
      coin: codeValue,
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: "Loyalty card created successfully and coins deducted",
      loyaltyCard,
      transaction
    });
  } catch (error) {
    console.error("Create loyalty card error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

export const redeemLoyaltyCard = async (req, res) => {
  try {
    // 1. Auth check
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Please login to redeem loyalty card"
      });
    }

    const { loyaltyCode } = req.body;

    if (!loyaltyCode) {
      return res.status(400).json({
        success: false,
        message: "loyaltyCode is required"
      });
    }

    // 2. Find loyalty card by code
    const loyaltyCard = await LoyaltyCard.findOne({ loyaltyCode });
    if (!loyaltyCard) {
      return res.status(404).json({
        success: false,
        message: "Invalid loyalty code"
      });
    }

    // 3. Private/public redemption rules
    if (loyaltyCard.isPrivateUse) {
      if (loyaltyCard.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "This loyalty card is private and can only be redeemed by its creator"
        });
      }
    } else {
      if (loyaltyCard.userId.toString() === req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "This public loyalty card cannot be redeemed by its creator"
        });
      }
    }

    // 4. Check if already used
    if (loyaltyCard.isCodeUsed) {
      return res.status(400).json({
        success: false,
        message: "This loyalty code has already been used"
      });
    }

    // 5. Check expiry
    if (loyaltyCard.expiryDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: "This loyalty code has expired"
      });
    }

    // 6. Find user's personal wallet
    const wallet = await Wallet.findOne({
      userId: req.user._id,
      walletType: "personal"
    });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found for user"
      });
    }

    // 7. Add coins to wallet
    wallet.totalCoin += loyaltyCard.codeValue;
    await wallet.save();

    // 8. Mark loyalty card as used
    loyaltyCard.isCodeUsed = true;
    await loyaltyCard.save();

    // 9. Create redeem transaction (fromLoyaltyCard → toWallet)
    const transaction = await Transaction.create({
      transactionType: "redeemLoyaltyCard",
      fromLoyaltyCard: loyaltyCard._id, // coins came from this loyalty card
      toWallet: wallet._id,             // coins go to this wallet
      userId: req.user._id,
      coin: loyaltyCard.codeValue,
      createdAt: new Date()
    });

    // 10. Return success
    res.status(200).json({
      success: true,
      message: "Loyalty card redeemed successfully, coins credited back",
      wallet,
      transaction
    });

  } catch (error) {
    console.error("Redeem loyalty card error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

export const generateWalletApiKey = catchAsync(async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Please log in'
    });
  }

  // Find user's wallet
  const wallet = await Wallet.findOne({ userId: req.user._id });
  if (!wallet) {
    return res.status(404).json({
      success: false,
      message: 'Wallet not found for user'
    });
  }

  // Generate new API key
  const newApiKey = crypto.randomBytes(32).toString('hex');

  wallet.apiKey = newApiKey;
  await wallet.save();

  res.status(200).json({
    success: true,
    message: 'API key generated successfully',
    apiKey: newApiKey
  });
});



export const transferCoinsWithApiKey = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key']; // Receiver wallet API key
    const { coins, redeemCode } = req.body;  // Redeem code from sender wallet

    // 1. Basic validation
    if (!apiKey || !coins || !redeemCode) {
      return res.status(400).json({
        success: false,
        message: "apiKey, coins and redeemCode are required"
      });
    }

    // 2. Find receiver wallet by apiKey
    const receiverWallet = await Wallet.findOne({ apiKey });
    if (!receiverWallet) {
      return res.status(404).json({
        success: false,
        message: "Receiver wallet not found for apiKey"
      });
    }

    // 3. Find sender wallet by redeemCode (handles Maps & plain objects)
    const allWallets = await Wallet.find();
    const senderWallet = allWallets.find(wallet => {
      const codes = wallet.redeemCode instanceof Map
        ? Array.from(wallet.redeemCode.values())
        : Object.values(wallet.redeemCode || {});

      return codes.some(code =>
        typeof code === "string" &&
        code.trim().toUpperCase() === redeemCode.trim().toUpperCase()
      );
    });

    if (!senderWallet) {
      return res.status(404).json({
        success: false,
        message: "Sender wallet not found for redeem code"
      });
    }

    // 4. Check sender's coin balance
    if (senderWallet.totalCoin < coins) {
      return res.status(400).json({
        success: false,
        message: "Insufficient coins"
      });
    }

    // 5. Transfer coins
    senderWallet.totalCoin -= coins;
    receiverWallet.totalCoin += coins;

    // Move used redeem code to usedCode (works for Map and plain object)
    if (senderWallet.redeemCode instanceof Map) {
      for (let [key, code] of senderWallet.redeemCode.entries()) {
        if (code.trim().toUpperCase() === redeemCode.trim().toUpperCase()) {
          if (!senderWallet.usedCode) senderWallet.usedCode = new Map();
          senderWallet.usedCode.set(key, code);
          senderWallet.redeemCode.delete(key);
          senderWallet.markModified('redeemCode');
          senderWallet.markModified('usedCode');
          break;
        }
      }
    } else {
      for (let key in senderWallet.redeemCode) {
        if (senderWallet.redeemCode[key].trim().toUpperCase() === redeemCode.trim().toUpperCase()) {
          if (!senderWallet.usedCode) senderWallet.usedCode = {};
          senderWallet.usedCode[key] = senderWallet.redeemCode[key];
          delete senderWallet.redeemCode[key];
          senderWallet.markModified('redeemCode');
          senderWallet.markModified('usedCode');
          break;
        }
      }
    }

    // 6. Save wallets
    await senderWallet.save();
    await receiverWallet.save();

    // 7. Record the transaction
    await Transaction.create({
      userId: senderWallet.userId,
      transactionType: "TPWallet",
      fromWallet: senderWallet._id,
      toWallet: receiverWallet._id,
      redeemCode,
      coin: coins,
      createdAt: new Date(),
    });

    // 8. Send success response
    res.json({
      success: true,
      message: "Coins transferred successfully",
      senderWallet: {
        userId: senderWallet.userId,
        totalCoin: senderWallet.totalCoin
      },
      receiverWallet: {
        userId: receiverWallet.userId,
        totalCoin: receiverWallet.totalCoin
      }
    });

  } catch (error) {
    console.error("Transfer error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getWalletDetails = async (req, res) => {
  try {
    // 1. Check authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Please login to view wallet"
      });
    }

    // 2. Find wallet by logged-in user ID
    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found for this user"
      });
    }

    // 3. Send wallet details
    res.json({
      success: true,
      wallet: {
        walletId: wallet._id,
        walletName: wallet.walletName,
        userId: wallet.userId,
        totalCoin: wallet.totalCoin,
        walletType: wallet.walletType,
        professionalWallet: wallet.professionalWallet,
        redeemCode: wallet.redeemCode,
        usedCode: wallet.usedCode,
        apiKey: wallet.apiKey
      }
    });

  } catch (error) {
    console.error("Get wallet error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

export const getWalletTransactions = async (req, res) => {
  try {
    // 1. Check authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Please login to view transactions"
      });
    }

    // 2. Find wallet by logged-in user ID
    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found for this user"
      });
    }

    // 3. Find transactions related to this wallet (only required fields)
    const transactions = await Transaction.find({
      $or: [
        { toWallet: wallet._id },
        { fromWallet: wallet._id }
      ]
    })
      .select("_id coin createdAt") // only transaction ID, coin amount, and time
      .sort({ createdAt: -1 }); // latest first

    // 4. Return transactions
    res.json({
      success: true,
      count: transactions.length,
      transactions
    });

  } catch (error) {
    console.error("Get wallet transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};









