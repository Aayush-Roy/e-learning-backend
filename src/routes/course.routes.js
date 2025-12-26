const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  unpublishCourse,
  getCourseReviews,
  addCourseReview,
  getInstructorCourses
} = require('../controllers/course.controller');
const {
  protect,
  restrictTo
} = require('../middlewares/auth.middleware');
const {
  checkCourseOwnership,
  checkIsInstructor
} = require('../middlewares/role.middleware');

const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.get('/', getAllCourses);
router.get('/:id', getCourseById);
router.get('/:id/reviews', getCourseReviews);

// Protected routes
router.use(protect);

// Instructor routes
// router.post('/', 
//   checkIsInstructor, 
//   upload.single('thumbnail'), 
//   createCourse
// );
router.post(
  '/',
  checkIsInstructor,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  createCourse
);

router.put('/:courseId',
  checkCourseOwnership,
  upload.single('thumbnail'),
  updateCourse
);

router.delete('/:courseId', 
  checkCourseOwnership, 
  deleteCourse
);

router.put('/:courseId/publish', 
  checkCourseOwnership, 
  publishCourse
);

router.put('/:courseId/unpublish', 
  checkCourseOwnership, 
  unpublishCourse
);

router.get('/instructor/my-courses', 
  checkIsInstructor, 
  getInstructorCourses
);

router.get('/instructor/:id/courses', 
  getInstructorCourses
);

// Student routes
router.post('/:id/reviews', 
  restrictTo('student'), 
  addCourseReview
);

module.exports = router;