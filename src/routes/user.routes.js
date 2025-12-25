const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserEnrollments,
  getInstructorStats
} = require('../controllers/user.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// Admin only routes
router.get('/', restrictTo('admin'), getAllUsers);
router.put('/:id', restrictTo('admin'), updateUser);
router.delete('/:id', restrictTo('admin'), deleteUser);

// Public user routes
router.get('/:id', getUserById);
router.get('/:id/enrollments', getUserEnrollments);
router.get('/:id/stats', getInstructorStats);

module.exports = router;