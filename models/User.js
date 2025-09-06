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

// 🔑 Generate JWT and save
userSchema.methods.generateAuthToken = async function () {
  try {
    const token = jwt.sign(
      { _id: this._id.toString(), isAdmin: this.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    this.token = token;
    await this.save();
    return token;
  } catch (err) {
    throw new Error('Token generation failed: ' + err.message);
  }
};

// 🔒 Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
