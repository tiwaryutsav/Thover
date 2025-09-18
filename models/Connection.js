import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema(
  {
    connectedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    connectedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: false,
    },
    topic: {
      type: String,
      required: false,
    },
    isConnected: {
      type: String,
      default: true,
    },
    price: {
      type: String,
      required: false,
    },
    // New field
    isAccepted: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Connection = mongoose.model('Connection', connectionSchema);
export default Connection;
