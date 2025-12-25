const User = require('../models/User.model');
const Course = require('../models/Course.model');
const Enrollment = require('../models/Enrollment.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(filter)
    ]);

    res.status(200).json(
      ApiResponse.success('Users retrieved successfully', {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('enrolledCourses')
      .populate('createdCourses');

    if (!user) {
      return next(ApiError.notFound('User not found'));
    }

    res.status(200).json(
      ApiResponse.success('User retrieved successfully', {
        user
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, role, isActive } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    // Prevent updating own role as admin
    if (req.user._id.toString() === req.params.id && role === 'admin') {
      return next(ApiError.forbidden('Cannot change your own role to admin'));
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return next(ApiError.notFound('User not found'));
    }

    res.status(200).json(
      ApiResponse.success('User updated successfully', {
        user
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    // Prevent deleting yourself
    if (req.user._id.toString() === req.params.id) {
      return next(ApiError.forbidden('Cannot delete your own account'));
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return next(ApiError.notFound('User not found'));
    }

    res.status(200).json(
      ApiResponse.success('User deleted successfully').toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const getUserEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.params.id })
      .populate('courseId')
      .sort({ enrolledAt: -1 });

    res.status(200).json(
      ApiResponse.success('User enrollments retrieved successfully', {
        enrollments
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const getInstructorStats = async (req, res, next) => {
  try {
    const instructorId = req.params.id;

    const [courses, enrollments, stats] = await Promise.all([
      Course.find({ instructor: instructorId }),
      Enrollment.find({ 
        courseId: { $in: await Course.find({ instructor: instructorId }).distinct('_id') },
        paymentStatus: 'completed'
      }),
      Course.aggregate([
        { $match: { instructor: mongoose.Types.ObjectId(instructorId) } },
        {
          $group: {
            _id: null,
            totalCourses: { $sum: 1 },
            totalEnrollments: { $sum: '$enrolledStudents' },
            totalRevenue: { $sum: { $multiply: ['$price', '$enrolledStudents'] } },
            averageRating: { $avg: '$rating' }
          }
        }
      ])
    ]);

    res.status(200).json(
      ApiResponse.success('Instructor stats retrieved successfully', {
        stats: stats[0] || {
          totalCourses: 0,
          totalEnrollments: 0,
          totalRevenue: 0,
          averageRating: 0
        },
        courses,
        totalEnrollments: enrollments.length
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserEnrollments,
  getInstructorStats
};