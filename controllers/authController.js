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


//abcd


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
    Bio: userData.Bio
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
      message: 'Invalid credentials'
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
    userId: user._id   // ✅ Returning user ID
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
  const { images, rating, text, imagePath, postId } = req.body;

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

export const getArea = async (req, res) => {
  const userId = req.user._id;

  // Get user's IP address
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.connection.remoteAddress;

  try {
    // Call ip-api.com to get location
    const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
    const geoData = await geoRes.json();

    if (geoData.status !== 'success') {
      return res.status(500).json({ error: 'Failed to fetch location from IP.' });
    }

    const area = geoData.city || geoData.regionName || geoData.country;
    const latitude = geoData.lat;
    const longitude = geoData.lon;

    // Update user in DB
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.area = {
      area,
      latitude,
      longitude
    };

    await user.save();

    // Send message with values, not as separate object
    res.json({
      message: `Location updated successfully. Area: ${area}, Latitude: ${latitude}, Longitude: ${longitude}`
    });
  } catch (err) {
    console.error('Location fetch error:', err);
    res.status(500).json({ error: 'Server error while fetching location.' });
  }
};

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

