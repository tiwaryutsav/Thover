// const User = require('../models/User');
// const catchAsync = require('../utils/catchAsync');

// exports.checkUserId = catchAsync(async (req, res) => {
//   const { userId } = req.body;
  
//   const existingUser = await User.findOne({ userId });
//   res.json({ 
//     available: !existingUser,
//     message: existingUser ? 'User ID already taken' : 'User ID available'
//   });
// });

// exports.getUserProfile = catchAsync(async (req, res) => {
//   const { userId } = req.params;
  
//   const user = await User.findOne({ userId }).select('-password');
//   if (!user) {
//     return res.status(404).json({
//       success: false,
//       message: 'User not found'
//     });
//   }

//   res.json({
//     success: true,
//     user
//   });
// }); 