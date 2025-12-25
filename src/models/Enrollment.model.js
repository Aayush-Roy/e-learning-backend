const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    progress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be less than 0'],
      max: [100, 'Progress cannot exceed 100']
    },
    completedLectures: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture'
    }],
    lastAccessed: {
      type: Date,
      default: Date.now
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    paymentId: {
      type: String // Stripe payment intent ID
    },
    amountPaid: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

// Ensure one enrollment per user per course
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Update user's enrolledCourses when enrollment is created
enrollmentSchema.post('save', async function() {
  if (this.paymentStatus === 'completed') {
    const User = mongoose.model('User');
    const Course = mongoose.model('Course');
    
    // Add course to user's enrolled courses
    await User.findByIdAndUpdate(this.userId, {
      $addToSet: { enrolledCourses: this.courseId }
    });
    
    // Update course's enrolled students count
    const course = await Course.findById(this.courseId);
    if (course) {
      await course.updateEnrolledStudents();
    }
  }
});

// Remove course from user's enrolledCourses when enrollment is deleted
enrollmentSchema.post('remove', async function() {
  const User = mongoose.model('User');
  const Course = mongoose.model('Course');
  
  await User.findByIdAndUpdate(this.userId, {
    $pull: { enrolledCourses: this.courseId }
  });
  
  // Update course's enrolled students count
  const course = await Course.findById(this.courseId);
  if (course) {
    await course.updateEnrolledStudents();
  }
});

// Check if enrollment is active
enrollmentSchema.virtual('isActive').get(function() {
  return this.paymentStatus === 'completed';
});

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

module.exports = Enrollment;