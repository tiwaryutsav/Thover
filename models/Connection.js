import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema(
  {
    connectedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // will be set from logged-in user
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true, // from request body
    },
    connectedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // from request body
    },
    text: {
      type: String,
      required: false,
    },
    topic: {
      type: String,
      required: false, // or true, if needed
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Connection = mongoose.model('Connection', connectionSchema);
export default Connection;
