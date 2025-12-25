const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { generateToken } = require('../utils/jwt');
const { sendWelcomeEmail } = require('../services/email.service');

const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(ApiError.conflict('User already exists with this email'));
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student'
    });

    // Generate token
    const token = generateToken(user._id);

    // Send welcome email (async)
    sendWelcomeEmail(user).catch(console.error);

    // Remove password from response
    user.password = undefined;

    res.status(201).json(
      ApiResponse.success('Registration successful', {
        user,
        token
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return next(ApiError.badRequest('Please provide email and password'));
    }

    // Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return next(ApiError.unauthorized('Invalid email or password'));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(ApiError.forbidden('Your account has been deactivated'));
    }

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    res.status(200).json(
      ApiResponse.success('Login successful', {
        user,
        token
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('enrolledCourses')
      .populate('createdCourses');

    res.status(200).json(
      ApiResponse.success('User profile retrieved', {
        user
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, bio } = req.body;
    
    // Filter allowed fields
    const allowedUpdates = { name, bio };
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    const user = await User.findByIdAndUpdate(
      req.user._id,
      allowedUpdates,
      { new: true, runValidators: true }
    );

    res.status(200).json(
      ApiResponse.success('Profile updated successfully', {
        user
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    if (!(await user.comparePassword(currentPassword))) {
      return next(ApiError.unauthorized('Current password is incorrect'));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = generateToken(user._id);

    res.status(200).json(
      ApiResponse.success('Password changed successfully', {
        token
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword
};