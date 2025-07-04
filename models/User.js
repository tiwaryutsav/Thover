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
    accountType: { type: String, default: 'Personal' },
    professionType: { type: String, default: null },
    profession: { type: String, default: null },
    bio: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },

    // ✅ New field to check admin approval
    isApproved: { type: Boolean, default: true },

    // ✅ New field to store document/image/video URLs
    documents: [{ type: String }],
  },
  {
    timestamps: true
  }
);




// ✅ Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 👇 Add userId from _id after save
userSchema.post('save', async function (doc, next) {
  if (!doc.userId) {
    const shortId = doc._id.toString();
    doc.userId = shortId;
    await doc.save();
  }
  next();
});

// ✅ Secure password comparison
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ✅ JWT generation
userSchema.methods.generateAuthToken = async function () {
  const token = jwt.sign(
    { userId: this._id, username: this.username, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: '365d' }
  );

  this.token = token;
  await this.save();
  return token;
};

const User = mongoose.model('User', userSchema);
export default User;
