const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Define the user schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  Bio: { type: String, required: true, trim: true },
  password: { type: String, required: true, select: true },
  phoneNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  token: { type: String },
  userId: { type: String, unique: true, trim: true }, // 👈 Add this
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
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  this.token = token;
  await this.save();
  return token;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
