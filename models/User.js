import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Define the user schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  Bio: { type: String, required: true, trim: true },
  password: { type: String, required: true, select: true },
  phoneNumber: { type: String, required: true, unique: true },
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
  // 👇 Added followers and following
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  accountType: {
    type: String,
    default: 'Personal'
  },
  professionType: { type: String, default: null },
  profession: { type: String, default: null },

});

userSchema.post('save', async function (doc, next) {
  if (!doc.userId) {
    const shortId = doc._id.toString(); // last 4 chars of ObjectId
    doc.userId = shortId;
    await doc.save(); // Save the updated document
  }
  next();
});

// Password comparison
userSchema.methods.comparePassword = async function (candidatePassword) {
  return candidatePassword === this.password;
};

// Generate JWT
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


// ✅ Use ES module export
const User = mongoose.model('User', userSchema);

export default User;
