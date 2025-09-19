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
    },
    topic: {
      type: String,
    },
    isConnected: {
      type: Boolean,
      default: true, // changed to Boolean
    },
    price: {
      type: Number, // changed to Number
    },
    isAccepted: {
      type: Boolean,
      default: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now, // for 28-day update tracking
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // keep createdAt only
  }
);

// Optional: prevent duplicate connections for same post + users


export const Connection = mongoose.model('Connection', connectionSchema);
export default Connection;
