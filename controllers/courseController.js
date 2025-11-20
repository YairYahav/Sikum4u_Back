const Course = require('../models/Course'); // FIXED PATH
const ErrorResponse = require('../utils/ErrorResponse'); 
const asyncHandler = require('../utils/asyncHandler'); 

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
exports.getCourses = asyncHandler(async (req, res, next) => {
  const courses = await Course.find().populate({
      path: 'children',
      select: 'name type'
  });
  res.status(200).json({ success: true, count: courses.length, data: courses });
});

// @desc    Get featured courses (for the homepage scrolling list)
// @route   GET /api/courses/featured
// @access  Public
exports.getFeaturedCourses = asyncHandler(async (req, res, next) => {
  const courses = await Course.find({ isFeatured: true }).limit(10).populate({
      path: 'children',
      select: 'name type'
  });
  res.status(200).json({ success: true, count: courses.length, data: courses });
});

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Public
exports.getCourseById = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id)
      .populate('reviews')
      .populate({
          path: 'children',
          select: 'name type'
      });
  
  if (!course) {
    return next(new ErrorResponse(`Course not found with id of ${req.params.id}`, 404));
  }
  res.status(200).json({ success: true, data: course });
});

// @desc    Create new course
// @route   POST /api/courses
// @access  Private/Admin
exports.createCourse = asyncHandler(async (req, res, next) => {
  req.body.admin = req.user.id; // User ID from auth middleware
  const course = await Course.create(req.body);
  res.status(201).json({ success: true, data: course });
});

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Admin
exports.updateCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findById(req.params.id);
  
  if (!course) {
    return next(new ErrorResponse(`Course not found with id of ${req.params.id}`, 404));
  }
  
  // Ensure user is the admin (or super admin if needed)
  if (course.admin.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this course', 401));
  }

  course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({ success: true, data: course });
});

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
exports.deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  
  if (!course) {
    return next(new ErrorResponse(`Course not found with id of ${req.params.id}`, 404));
  }

  // Ensure user is the admin (or super admin if needed)
  if (course.admin.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this course', 401));
  }

  // Use deleteOne() to trigger the pre('deleteOne') hook for cascade deletion
  await course.deleteOne(); 

  res.status(200).json({ success: true, data: {} });
});