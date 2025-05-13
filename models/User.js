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
  userId: { type: String, unique: true, trim: true }, // 👈 Add this
  profile_pic: { type: String },
  area: {
  area: { type: String, default: null },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null }
},

  createdAt: { type: Date, default: Date.now }
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
    process.env.JWT_SECRET
    // No expiresIn => token does not expire
  );

  this.token = token;
  await this.save();
  return token;
};


// ✅ Use ES module export
const User = mongoose.model('User', userSchema);

export default User;
