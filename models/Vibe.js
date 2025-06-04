import mongoose from 'mongoose';

const vibeSchema = new mongoose.Schema({
  images: [{
    type: String,
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: String,
  },
  text: {
    type: String,
  },
  imagePath: {
    type: String,
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  topic: {
    type: String, // e.g., "Travel", "Food", etc.
  },
  vibeType: {
    type: String, // e.g., "Positive", "Negative", "Neutral"
    default : null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const Vibe = mongoose.model('Vibe', vibeSchema);

export default Vibe;
