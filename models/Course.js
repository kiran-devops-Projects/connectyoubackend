const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  duration: { type: String, required: true },
  videoUrl: String,
  resources: [{ title: String, url: String, type: String }]
});

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  lessons: [lessonSchema]
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: [
      'Web Development', 'Data Science', 'Cloud Computing', 
      'Mobile Development', 'DevOps', 'Career Skills', 
      'Industry Insights', 'Personal Development', 'Design', 
      'Business', 'Marketing', 'Personal','Other'
    ]
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced']
  },
  duration: { type: String, required: true },
  price: { type: Number, required: true },
  rating: { type: Number, default: 0 },
  enrolledCount: { type: Number, default: 0 },
  enrolled: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    progress: { type: Number, default: 0 },
    completedContent: [String],
    quizScores: [{ quizId: String, score: Number }],
    startDate: Date,
    lastAccessed: Date
  }],
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: Number,
    comment: String,
    date: { type: Date, default: Date.now }
  }],
  tags: [String],
  thumbnail: String,
  isPublished: { type: Boolean, default: false },
  modules: [moduleSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

courseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Course', courseSchema);
