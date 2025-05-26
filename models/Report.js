import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },
  vibe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vibe',  // Note: Change 'Vive' to 'Vibe' if your model is named Vibe
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  reportedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: { createdAt: false, updatedAt: false } });

// Validate that either post or vive is set, but not both
reportSchema.pre('validate', function (next) {
  if (!this.post && !this.vibe) {
    return next(new Error('Either post or vive must be provided.'));
  }
  if (this.post && this.vibe) {
    return next(new Error('Only one of post or vive should be provided.'));
  }
  next();
});

const Report = mongoose.model('Report', reportSchema);
export default Report;
