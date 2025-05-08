const mongoose = require('mongoose');

const vibeSchema = new mongoose.Schema({
  Replies: {
    type: String,
    required: true
  },
  images: [{  // Changed from `image` to `images`
    type: String,
    required: true
  }],
  user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  rating: {
    type: String,
    required : true,
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Vibe', vibeSchema);
