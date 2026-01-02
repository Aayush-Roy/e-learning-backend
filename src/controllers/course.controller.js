const Course = require('../models/Course.model');
const Lecture = require('../models/Lecture.model');
const Enrollment = require('../models/Enrollment.model');
const Review = require('../models/Review.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { uploadImage, uploadVideo } = require('../services/cloudinary.service');

const getCourses = async(req,res,next)=>{
  try {
    const courses = await Course.find()
      .populate('instructor', 'name email profilePicture')
      .populate('lectures');
      console.log("courses->",courses)
    res.status(200).json(
      ApiResponse.success('Courses retrieved successfully', { courses }).toJSON()
    );
  } catch (error) {
    next(error);
  }
}
// getCourses();

const getAllCourses = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      level, 
      minPrice, 
      maxPrice, 
      sortBy = '-createdAt',
      search,
      instructor,
      isPublished = true
    } = req.query;

    const filter = { isPublished };
    
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (instructor) filter.instructor = instructor;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('instructor', 'name email profilePicture')
        .populate('lectures')
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sortBy),
      Course.countDocuments(filter)
    ]);

    res.status(200).json(
      ApiResponse.success('Courses retrieved successfully', {
        courses,
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

const getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name email bio profilePicture')
      .populate({
        path: 'lectures',
        options: { sort: { position: 1 } }
      });
      console.log("course->",course)

    if (!course) {
      return next(ApiError.notFound('Course not found'));
    }

    // Check if user is enrolled or is instructor/admin
    let isEnrolled = false;
    if (req.user) {
      const enrollment = await Enrollment.findOne({
        userId: req.user._id,
        courseId: course._id,
        paymentStatus: 'completed'
      });
      isEnrolled = !!enrollment;
    }

    res.status(200).json(
      ApiResponse.success('Course retrieved successfully', {
        course,
        isEnrolled,
        canAccess: isEnrolled || 
                  (req.user && req.user.role === 'admin') || 
                  (req.user && course.instructor._id.toString() === req.user._id.toString())
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

// const createCourse = async (req, res, next) => {
//   try {
//     const { title, description, price, category, level, requirements, learningOutcomes } = req.body;

//     // Check if instructor
//     if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
//       return next(ApiError.forbidden('Only instructors can create courses'));
//     }

//     // Upload thumbnail if provided
//     let thumbnailUrl = '';
//     if (req.file) {
//       const uploadResult = await uploadImage(req.file.buffer.toString('base64'));
//       thumbnailUrl = uploadResult.url;
//     }

//     const course = await Course.create({
//       title,
//       description,
//       shortDescription: description.substring(0, 200),
//       price: parseFloat(price),
//       category,
//       level,
//       thumbnail: thumbnailUrl,
//       instructor: req.user._id,
//       requirements: requirements ? JSON.parse(requirements) : [],
//       learningOutcomes: learningOutcomes ? JSON.parse(learningOutcomes) : [],
//       isPublished: false // Courses start as unpublished
//     });

//     // Add course to instructor's created courses
//     await req.user.updateOne({
//       $addToSet: { createdCourses: course._id }
//     });

//     res.status(201).json(
//       ApiResponse.success('Course created successfully', {
//         course
//       }).toJSON()
//     );
//   } catch (error) {
//     next(error);
//   }
// };


// const createCourse = async (req, res, next) => {
//   try {
//     const {
//       title,
//       description,
//       price,
//       category,
//       level,
//       requirements,
//       learningOutcomes
//     } = req.body;

//     // 🔐 Role check
//     if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
//       return next(ApiError.forbidden('Only instructors can create courses'));
//     }

//     // 📂 Files from multer.fields()
//     const thumbnailFile = req.files?.thumbnail?.[0];
//     const videoFile = req.files?.video?.[0];

//     // ❌ Thumbnail required
//     if (!thumbnailFile) {
//       return next(ApiError.badRequest('Please provide course thumbnail'));
//     }

//     // 🖼️ Upload Thumbnail (IMAGE)
//     const thumbnailUpload = await cloudinary.uploader.upload(
//       `data:${thumbnailFile.mimetype};base64,${thumbnailFile.buffer.toString('base64')}`,
//       {
//         folder: 'udemy-clone/thumbnails',
//         resource_type: 'image',
//         quality: 'auto',
//         fetch_format: 'auto'
//       }
//     );

//     // 🎥 Upload Video (OPTIONAL)
//     let introVideoUrl = '';

//     if (videoFile) {
//       const videoUpload = await cloudinary.uploader.upload(
//         `data:${videoFile.mimetype};base64,${videoFile.buffer.toString('base64')}`,
//         {
//           folder: 'udemy-clone/course-intros',
//           resource_type: 'video'
//         }
//       );

//       introVideoUrl = videoUpload.secure_url;
//     }

//     // 🧠 Create Course
//     const course = await Course.create({
//       title,
//       description,
//       shortDescription: description.substring(0, 200),
//       price: parseFloat(price),
//       category,
//       level,
//       thumbnail: thumbnailUpload.secure_url,
//       introVideo: introVideoUrl,
//       instructor: req.user._id,
//       requirements: requirements ? JSON.parse(requirements) : [],
//       learningOutcomes: learningOutcomes ? JSON.parse(learningOutcomes) : [],
//       isPublished: false
//     });

//     // ➕ Add course to instructor
//     await req.user.updateOne({
//       $addToSet: { createdCourses: course._id }
//     });

//     return res.status(201).json(
//       ApiResponse.success('Course created successfully', { course }).toJSON()
//     );

//   } catch (error) {
//     next(error);
//   }
// };

// const createCourse = async (req, res, next) => {
//   try {
//     const {
//       title,
//       description,
//       price,
//       category,
//       level,
//       requirements,
//       learningOutcomes
//     } = req.body;

//     if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
//       return next(ApiError.forbidden('Only instructors can create courses'));
//     }

//     // 📂 FILES
//     const thumbnailFile = req.files?.thumbnail?.[0];
//     const videoFile = req.files?.video?.[0]; // 👈 SAME PATTERN
//     console.log("videoFile->",videoFile)

//     // ❌ Thumbnail required
//     if (!thumbnailFile) {
//       return next(ApiError.badRequest('Please provide course thumbnail'));
//     }

//     // 🖼️ Upload Thumbnail (IMAGE)
//     const thumbnailUpload = await uploadImage(
//       thumbnailFile.buffer.toString('base64')
//     );

//     // 🎥 Upload Video (OPTIONAL)
//     let introVideoUrl = '';
//     if (videoFile) {
//       const videoUpload = await uploadVideo( // 👈 ya cloudinary directly
//         videoFile.buffer.toString('base64')
//       );
//       introVideoUrl = videoUpload.url;
//     }

//     const course = await Course.create({
//       title,
//       description,
//       shortDescription: description.substring(0, 200),
//       price: parseFloat(price),
//       category,
//       level,
//       thumbnail: thumbnailUpload.url,
//       introVideo: introVideoUrl, // 👈 NEW FIELD
//       instructor: req.user._id,
//       requirements: requirements ? JSON.parse(requirements) : [],
//       learningOutcomes: learningOutcomes ? JSON.parse(learningOutcomes) : [],
//       isPublished: false
//     });

//     await req.user.updateOne({
//       $addToSet: { createdCourses: course._id }
//     });

//     res.status(201).json(
//       ApiResponse.success('Course created successfully', { course }).toJSON()
//     );

//   } catch (error) {
//     next(error);
//   }
// };
const createCourse = async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      category,
      level,
      requirements,
      learningOutcomes
    } = req.body;

    if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return next(ApiError.forbidden('Only instructors can create courses'));
    }

    // 📂 FILES - 'video' की जगह 'introVideo' check करें
    const thumbnailFile = req.files?.thumbnail?.[0];
    const introVideoFile = req.files?.introVideo?.[0]; // 'video' से 'introVideo' में change
    console.log("Files received:", {
      thumbnail: thumbnailFile ? "present" : "missing",
      introVideo: introVideoFile ? "present" : "missing"
    });

    // ❌ Thumbnail required
    if (!thumbnailFile) {
      return next(ApiError.badRequest('Please provide course thumbnail'));
    }

    // 🖼️ Upload Thumbnail (IMAGE)
    const thumbnailUpload = await uploadImage(
      thumbnailFile.buffer.toString('base64')
    );

    // 🎥 Upload Video (OPTIONAL)
    let introVideoUrl = '';
    if (introVideoFile) {
      try {
        const videoUpload = await uploadVideo(
          introVideoFile.buffer.toString('base64')
        );
        introVideoUrl = videoUpload.url;
        console.log("Intro video uploaded successfully:", introVideoUrl);
      } catch (videoError) {
        console.error("Video upload failed:", videoError);
        // Continue without video if upload fails
      }
    }

    const course = await Course.create({
      title,
      description,
      shortDescription: description.substring(0, 200),
      price: parseFloat(price),
      category,
      level,
      thumbnail: thumbnailUpload.url,
      introVideo: introVideoUrl,
      instructor: req.user._id,
      requirements: requirements ? JSON.parse(requirements) : [],
      learningOutcomes: learningOutcomes ? JSON.parse(learningOutcomes) : [],
      isPublished: false
    });

    await req.user.updateOne({
      $addToSet: { createdCourses: course._id }
    });

    res.status(201).json(
      ApiResponse.success('Course created successfully', { course }).toJSON()
    );

  } catch (error) {
    console.error("Create course error:", error);
    next(error);
  }
};



const updateCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.instructor;
    delete updateData.rating;
    delete updateData.totalRatings;
    delete updateData.enrolledStudents;

    // Handle thumbnail update
    if (req.file) {
      const uploadResult = await uploadImage(req.file.buffer.toString('base64'));
      updateData.thumbnail = uploadResult.url;
    }

    // Update short description if description changed
    if (updateData.description) {
      updateData.shortDescription = updateData.description.substring(0, 200);
    }

    const course = await Course.findByIdAndUpdate(
      courseId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!course) {
      return next(ApiError.notFound('Course not found'));
    }

    res.status(200).json(
      ApiResponse.success('Course updated successfully', {
        course
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Check if course has enrollments
    const enrollmentCount = await Enrollment.countDocuments({ 
      courseId, 
      paymentStatus: 'completed' 
    });

    if (enrollmentCount > 0) {
      return next(ApiError.badRequest('Cannot delete course with active enrollments'));
    }

    // Delete all lectures
    await Lecture.deleteMany({ courseId });

    // Delete course
    const course = await Course.findByIdAndDelete(courseId);

    if (!course) {
      return next(ApiError.notFound('Course not found'));
    }

    // Remove from instructor's created courses
    await req.user.updateOne({
      $pull: { createdCourses: courseId }
    });

    res.status(200).json(
      ApiResponse.success('Course deleted successfully').toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const publishCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findByIdAndUpdate(
      courseId,
      { isPublished: true },
      { new: true }
    );

    if (!course) {
      return next(ApiError.notFound('Course not found'));
    }

    res.status(200).json(
      ApiResponse.success('Course published successfully', {
        course
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const unpublishCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findByIdAndUpdate(
      courseId,
      { isPublished: false },
      { new: true }
    );

    if (!course) {
      return next(ApiError.notFound('Course not found'));
    }

    res.status(200).json(
      ApiResponse.success('Course unpublished successfully', {
        course
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const getCourseReviews = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ courseId, isApproved: true })
        .populate('userId', 'name profilePicture')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Review.countDocuments({ courseId, isApproved: true })
    ]);

    res.status(200).json(
      ApiResponse.success('Course reviews retrieved successfully', {
        reviews,
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

const addCourseReview = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { rating, comment } = req.body;

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
      paymentStatus: 'completed'
    });

    if (!enrollment) {
      return next(ApiError.forbidden('You must be enrolled in the course to review it'));
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      userId: req.user._id,
      courseId
    });

    if (existingReview) {
      return next(ApiError.conflict('You have already reviewed this course'));
    }

    const review = await Review.create({
      userId: req.user._id,
      courseId,
      rating,
      comment,
      isApproved: req.user.role === 'admin' // Auto-approve admin reviews
    });

    res.status(201).json(
      ApiResponse.success('Review added successfully', {
        review
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const getInstructorCourses = async (req, res, next) => {
  try {
    const instructorId = req.params.id || req.user._id;
    const { page = 1, limit = 10, isPublished } = req.query;

    const filter = { instructor: instructorId };
    if (isPublished !== undefined) {
      filter.isPublished = isPublished === 'true';
    }

    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('lectures')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Course.countDocuments(filter)
    ]);

    res.status(200).json(
      ApiResponse.success('Instructor courses retrieved successfully', {
        courses,
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

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  unpublishCourse,
  getCourseReviews,
  addCourseReview,
  getCourses,
  getInstructorCourses
};
