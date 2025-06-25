import mongoose from 'mongoose';

const spotliteSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      unique: true
    },
    vibeCount: {
      type: Number,
      required: true
    },
    spotlite: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Spotlite = mongoose.model('Spotlite', spotliteSchema);

export default Spotlite;
