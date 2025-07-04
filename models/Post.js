import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  images: [{
    type: String,
    required: false
  }],
  imagePath: {
    type: String,
    required: false
  },
  price: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
}, { timestamps: true });

const Post = mongoose.model('Post', postSchema);

export default Post;
