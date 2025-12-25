const Lecture = require('../models/Lecture.model');
const Course = require('../models/Course.model');
const Enrollment = require('../models/Enrollment.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { uploadVideo } = require('../services/cloudinary.service');

const getCourseLectures = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    const lectures = await Lecture.find({ courseId })
      .sort({ position: 1 });

    res.status(200).json(
      ApiResponse.success('Lectures retrieved successfully', {
        lectures
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const getLectureById = async (req, res, next) => {
  try {
    const lecture = await Lecture.findById(req.params.lectureId)
      .populate('courseId');

    if (!lecture) {
      return next(ApiError.notFound('Lecture not found'));
    }

    // Check access
    const course = lecture.courseId;
    const canAccess = lecture.isPreview || 
                     (req.user && (
                       req.user.role === 'admin' ||
                       course.instructor.toString() === req.user._id.toString()
                     ));

    if (!canAccess && req.user) {
      // Check if enrolled
      const enrollment = await Enrollment.findOne({
        userId: req.user._id,
        courseId: course._id,
        paymentStatus: 'completed'
      });
      
      if (!enrollment) {
        return next(ApiError.forbidden('You are not enrolled in this course'));
      }
    }

    res.status(200).json(
      ApiResponse.success('Lecture retrieved successfully', {
        lecture,
        canAccess: canAccess || (req.user && enrollment)
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const createLecture = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { title, description, duration, isPreview, position, resources } = req.body;

    // Check course exists and user is instructor
    const course = await Course.findById(courseId);
    if (!course) {
      return next(ApiError.notFound('Course not found'));
    }

    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(ApiError.forbidden('You are not authorized to add lectures to this course'));
    }

    // Upload video if provided
    let videoUrl = '';
    if (req.file) {
      const uploadResult = await uploadVideo(req.file.buffer.toString('base64'));
      videoUrl = uploadResult.url;
    }

    // Parse resources if provided
    let parsedResources = [];
    if (resources) {
      parsedResources = JSON.parse(resources);
    }

    const lecture = await Lecture.create({
      title,
      description,
      videoUrl,
      duration: parseFloat(duration),
      isPreview: isPreview === 'true',
      courseId,
      position: parseInt(position),
      resources: parsedResources
    });

    // Add lecture to course
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { lectures: lecture._id }
    });

    // Update course total duration
    await course.updateTotalDuration();

    res.status(201).json(
      ApiResponse.success('Lecture created successfully', {
        lecture
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const updateLecture = async (req, res, next) => {
  try {
    const { lectureId } = req.params;
    const updateData = req.body;

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return next(ApiError.notFound('Lecture not found'));
    }

    // Check authorization
    const course = await Course.findById(lecture.courseId);
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(ApiError.forbidden('You are not authorized to update this lecture'));
    }

    // Upload new video if provided
    if (req.file) {
      const uploadResult = await uploadVideo(req.file.buffer.toString('base64'));
      updateData.videoUrl = uploadResult.url;
    }

    // Parse resources if provided
    if (updateData.resources) {
      updateData.resources = JSON.parse(updateData.resources);
    }

    const updatedLecture = await Lecture.findByIdAndUpdate(
      lectureId,
      updateData,
      { new: true, runValidators: true }
    );

    // Update course total duration if duration changed
    if (updateData.duration) {
      const course = await Course.findById(lecture.courseId);
      if (course) {
        await course.updateTotalDuration();
      }
    }

    res.status(200).json(
      ApiResponse.success('Lecture updated successfully', {
        lecture: updatedLecture
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const deleteLecture = async (req, res, next) => {
  try {
    const { lectureId } = req.params;

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return next(ApiError.notFound('Lecture not found'));
    }

    // Check authorization
    const course = await Course.findById(lecture.courseId);
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(ApiError.forbidden('You are not authorized to delete this lecture'));
    }

    // Remove lecture from course
    await Course.findByIdAndUpdate(lecture.courseId, {
      $pull: { lectures: lectureId }
    });

    // Delete lecture
    await lecture.remove();

    res.status(200).json(
      ApiResponse.success('Lecture deleted successfully').toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const updateLectureProgress = async (req, res, next) => {
  try {
    const { lectureId } = req.params;
    const { completed } = req.body; // boolean

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return next(ApiError.notFound('Lecture not found'));
    }

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: lecture.courseId,
      paymentStatus: 'completed'
    });

    if (!enrollment) {
      return next(ApiError.forbidden('You are not enrolled in this course'));
    }

    // Update completed lectures
    if (completed) {
      enrollment.completedLectures.addToSet(lectureId);
    } else {
      enrollment.completedLectures.pull(lectureId);
    }

    // Calculate progress percentage
    const course = await Course.findById(lecture.courseId).populate('lectures');
    const totalLectures = course.lectures.length;
    const completedCount = enrollment.completedLectures.length;
    enrollment.progress = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;
    enrollment.lastAccessed = new Date();

    await enrollment.save();

    res.status(200).json(
      ApiResponse.success('Progress updated successfully', {
        progress: enrollment.progress,
        completedLectures: enrollment.completedLectures
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const reorderLectures = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { lectures } = req.body; // Array of { id, position }

    // Check authorization
    const course = await Course.findById(courseId);
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(ApiError.forbidden('You are not authorized to reorder lectures'));
    }

    // Update positions
    const updatePromises = lectures.map(({ id, position }) =>
      Lecture.findByIdAndUpdate(id, { position }, { new: true })
    );

    await Promise.all(updatePromises);

    res.status(200).json(
      ApiResponse.success('Lectures reordered successfully').toJSON()
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourseLectures,
  getLectureById,
  createLecture,
  updateLecture,
  deleteLecture,
  updateLectureProgress,
  reorderLectures
};