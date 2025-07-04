import mongoose from 'mongoose';

// Schema for a single question
const singleQuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (val) => val.length >= 2 && val.length <= 6,
      message: 'Each question must have between 2 and 6 options'
    }
  },
  correctAnswer: {
    type: String,
    required: true,
    validate: {
      validator: function (val) {
        return this.options.includes(val);
      },
      message: 'Correct answer must be one of the options'
    }
  }
});

// Schema for the full question paper
const questionPaperSchema = new mongoose.Schema(
  {
    paperNo: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    class: { type: String, required: true, trim: true },
    subject: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    questions: [singleQuestionSchema]
  },
  { timestamps: true }
);

const QuestionPaper = mongoose.model('QuestionPaper', questionPaperSchema);

export default QuestionPaper;
