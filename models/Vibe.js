import mongoose from 'mongoose';

const vibeSchema = new mongoose.Schema({
  images: [{ type: String }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: { type: String },
  text: { type: String },
  imagePath: { type: String },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  topic: { type: String },
  vibeType: { type: String, default: null }
}, {
  timestamps: true // ✅ important for createdAt
});

const Vibe = mongoose.model('Vibe', vibeSchema);

export default Vibe; // ✅ ES module export
