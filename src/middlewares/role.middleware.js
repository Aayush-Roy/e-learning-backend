const ApiError = require('../utils/ApiError');

const checkCourseOwnership = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const Course = require('../models/Course.model');
    
    const course = await Course.findById(courseId);
    
    if (!course) {
      return next(ApiError.notFound('Course not found'));
    }

    // Check if user is the instructor of the course or admin
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(ApiError.forbidden('You are not authorized to modify this course'));
    }

    req.course = course;
    next();
  } catch (error) {
    next(error);
  }
};

const checkEnrollment = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const Enrollment = require('../models/Enrollment.model');
    
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
      paymentStatus: 'completed'
    });

    if (!enrollment) {
      return next(ApiError.forbidden('You are not enrolled in this course'));
    }

    req.enrollment = enrollment;
    next();
  } catch (error) {
    next(error);
  }
};

const checkIsInstructor = async (req, res, next) => {
  if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return next(ApiError.forbidden('Only instructors can perform this action'));
  }
  next();
};

const checkIsStudent = async (req, res, next) => {
  if (req.user.role !== 'student') {
    return next(ApiError.forbidden('Only students can perform this action'));
  }
  next();
};

module.exports = {
  checkCourseOwnership,
  checkEnrollment,
  checkIsInstructor,
  checkIsStudent
};