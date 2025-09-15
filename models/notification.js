import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // who receives the notification
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },

    // 🔹 Optional references
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    vibeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vibe",
      default: null,
    },
    otherUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // the user who triggered this notification
    },

    isRead: {
      type: Boolean,
      default: false, // unread by default
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
