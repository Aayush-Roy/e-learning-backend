const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
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
    rating: {
      type: Number,
      required: [true, 'Please provide a rating'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    comment: {
      type: String,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    isApproved: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure one review per user per course
reviewSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Update course rating when review is saved
reviewSchema.post('save', async function() {
  if (this.isApproved) {
    const Course = mongoose.model('Course');
    const Review = mongoose.model('Review');
    
    const reviews = await Review.find({ 
      courseId: this.courseId, 
      isApproved: true 
    });
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    
    await Course.findByIdAndUpdate(this.courseId, {
      rating: totalRating,
      totalRatings: reviews.length
    });
  }
});

// Update course rating when review is removed
reviewSchema.post('remove', async function() {
  if (this.isApproved) {
    const Course = mongoose.model('Course');
    const Review = mongoose.model('Review');
    
    const reviews = await Review.find({ 
      courseId: this.courseId, 
      isApproved: true 
    });
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    
    await Course.findByIdAndUpdate(this.courseId, {
      rating: totalRating,
      totalRatings: reviews.length
    });
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;