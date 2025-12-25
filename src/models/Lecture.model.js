const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide lecture title'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    videoUrl: {
      type: String,
      required: [true, 'Please provide video URL']
    },
    duration: {
      type: Number, // in minutes
      required: [true, 'Please provide lecture duration'],
      min: [1, 'Duration must be at least 1 minute']
    },
    thumbnail: {
      type: String,
      default: ''
    },
    isPreview: {
      type: Boolean,
      default: false
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    position: {
      type: Number,
      required: true,
      min: [1, 'Position must be at least 1']
    },
    resources: [{
      name: String,
      url: String,
      type: String // pdf, zip, doc, etc.
    }]
  },
  {
    timestamps: true
  }
);

// Ensure position is unique within a course
lectureSchema.index({ courseId: 1, position: 1 }, { unique: true });

// Update course's total duration when lecture is saved
lectureSchema.post('save', async function() {
  const Course = mongoose.model('Course');
  const course = await Course.findById(this.courseId);
  if (course) {
    await course.updateTotalDuration();
  }
});

// Update course's total duration when lecture is removed
lectureSchema.post('remove', async function() {
  const Course = mongoose.model('Course');
  const course = await Course.findById(this.courseId);
  if (course) {
    await course.updateTotalDuration();
  }
});

const Lecture = mongoose.model('Lecture', lectureSchema);

module.exports = Lecture;