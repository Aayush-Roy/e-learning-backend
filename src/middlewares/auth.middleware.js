const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User.model');

const protect = async (req, res, next) => {
  try {
    // 1) Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(ApiError.unauthorized('You are not logged in. Please log in to get access.'));
    }

    // 2) Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return next(ApiError.unauthorized('Invalid token. Please log in again.'));
    }

    // 3) Check if user still exists
    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      return next(ApiError.unauthorized('The user belonging to this token no longer exists.'));
    }

    // 4) Check if user changed password after token was issued
    // (Optional: implement if you have passwordChangedAt field)

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden('You do not have permission to perform this action')
      );
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo
};