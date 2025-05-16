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
    required: true
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
  favorite: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

const Post = mongoose.model('Post', postSchema);

export default Post;
