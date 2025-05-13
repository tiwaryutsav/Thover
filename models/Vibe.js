import mongoose from 'mongoose';

const vibeSchema = new mongoose.Schema({
  images: [{  // Changed from `image` to `images`
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
    required: true,
  },
  imagePath: {  // <-- New field added
    type: String,
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post', // link to Post
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const Vibe = mongoose.model('Vibe', vibeSchema);

export default Vibe;
