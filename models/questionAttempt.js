import mongoose from 'mongoose';

const questionAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  class: { type: String, required: true },
  subject: { type: String, required: true },
  week: { type: String, required: true }, // Format: GGGG-[W]WW
  givenAt: { type: Date, default: Date.now }
});

const QuestionAttempt = mongoose.model('QuestionAttempt', questionAttemptSchema);

export default QuestionAttempt;
