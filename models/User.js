import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: true },
    email: { type: String, unique: true },
    name: { type: String, required: true, trim: true },
    token: { type: String },
    userId: { type: String, unique: true, trim: true },
    profile_pic: { type: String },
    area: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    country: { type: String, default: null },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    bio: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    isAdmin: { type: Boolean, default: false },
    accountType: { type: String, default: 'Personal' },

    // ✅ Single optional links object
    links: {
      linkName: { type: String, trim: true, default: null },
      url: { type: String, trim: true, default: null },
    },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;
