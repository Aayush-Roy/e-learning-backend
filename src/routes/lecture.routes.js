const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getCourseLectures,
  getLectureById,
  createLecture,
  updateLecture,
  deleteLecture,
  updateLectureProgress,
  reorderLectures
} = require('../controllers/lecture.controller');
const {
  protect,
  restrictTo
} = require('../middlewares/auth.middleware');
const {
  checkCourseOwnership,
  checkEnrollment
} = require('../middlewares/role.middleware');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit for videos
});

// Public routes (preview lectures only)
router.get('/course/:courseId', getCourseLectures);

// Protected routes
router.use(protect);

// Get specific lecture (requires enrollment or instructor access)
router.get('/:lectureId', getLectureById);

// Instructor routes
router.post('/course/:courseId',
  checkCourseOwnership,
  upload.single('video'),
  createLecture
);

router.put('/:lectureId',
  checkCourseOwnership,
  upload.single('video'),
  updateLecture
);

router.delete('/:lectureId', 
  checkCourseOwnership, 
  deleteLecture
);

router.put('/course/:courseId/reorder',
  checkCourseOwnership,
  reorderLectures
);

// Student routes
router.put('/:lectureId/progress',
  restrictTo('student'),
  checkEnrollment,
  updateLectureProgress
);

module.exports = router;