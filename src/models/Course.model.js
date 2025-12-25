const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide course title'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Please provide course description'],
      minlength: [50, 'Description must be at least 50 characters']
    },
    shortDescription: {
      type: String,
      maxlength: [200, 'Short description cannot exceed 200 characters']
    },
    price: {
      type: Number,
      required: [true, 'Please provide course price'],
      min: [0, 'Price cannot be negative']
    },
    category: {
      type: String,
      required: [true, 'Please provide course category'],
      enum: [
        'web development',
        'mobile development',
        'data science',
        'machine learning',
        'design',
        'business',
        'marketing',
        'music',
        'photography',
        'health & fitness',
        'other'
      ]
    },
    level: {
      type: String,
      required: [true, 'Please provide course level'],
      enum: ['beginner', 'intermediate', 'advanced', 'all levels']
    },
    thumbnail: {
      type: String,
      required: [true, 'Please provide course thumbnail']
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lectures: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture'
    }],
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating must be at least 0'],
      max: [5, 'Rating cannot exceed 5']
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    enrolledStudents: {
      type: Number,
      default: 0
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    requirements: [{
      type: String
    }],
    learningOutcomes: [{
      type: String
    }],
    totalDuration: {
      type: Number, // in minutes
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for getting average rating
courseSchema.virtual('averageRating').get(function() {
  if (this.totalRatings === 0) return 0;
  return this.rating / this.totalRatings;
});

// Update total duration when lectures are added/removed
courseSchema.methods.updateTotalDuration = async function() {
  const Lecture = mongoose.model('Lecture');
  const lectures = await Lecture.find({ _id: { $in: this.lectures } });
  this.totalDuration = lectures.reduce((total, lecture) => total + lecture.duration, 0);
  await this.save();
};

// Update enrolled students count
courseSchema.methods.updateEnrolledStudents = async function() {
  const Enrollment = mongoose.model('Enrollment');
  const count = await Enrollment.countDocuments({ 
    courseId: this._id, 
    paymentStatus: 'completed' 
  });
  this.enrolledStudents = count;
  await this.save();
};

// Check if course is free
courseSchema.virtual('isFree').get(function() {
  return this.price === 0;
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;