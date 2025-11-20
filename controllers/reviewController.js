const Review = require('../models/Review'); // FIXED PATH
const Course = require('../models/Course'); // FIXED PATH
const File = require('../models/File'); // FIXED PATH
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse'); 


// @desc    Get reviews for a specific resource (Course or File)
// @route   GET /api/reviews?resourceId=...&resourceType=...
// @access  Public
exports.getReviews = asyncHandler(async (req, res, next) => {
  const { resourceId, resourceType } = req.query;

  if (!resourceId || !resourceType) {
    return next(new ErrorResponse('Resource ID and Type are required', 400));
  }
  if (!['Course', 'File'].includes(resourceType)) {
      return next(new ErrorResponse('Invalid Resource Type', 400));
  }

  const reviews = await Review.find({ resourceId, resourceType }).populate({
    path: 'user',
    select: 'username firstName lastName' 
  });
  
  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews
  });
});


// @desc    Add a review (rating/comment) to a resource
// @route   POST /api/reviews
// @access  Private (Logged-in users)
exports.addReview = asyncHandler(async (req, res, next) => {
  // auth() middleware ensures req.user exists
  req.body.user = req.user.id; 
  const { rating, comment, resourceId, resourceType } = req.body;

  if (!['Course', 'File'].includes(resourceType)) {
      return next(new ErrorResponse('Invalid Resource Type', 400));
  }

  // Check if the resource exists
  const Model = resourceType === 'Course' ? Course : File;
  const resource = await Model.findById(resourceId);

  if (!resource) {
    return next(new ErrorResponse(`${resourceType} not found`, 404));
  }
  
  try {
    const review = await Review.create(req.body);

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (err) {
    // 11000 is a duplicate key error (user already reviewed this resource)
    if (err.code === 11000) {
        return next(new ErrorResponse('You have already reviewed this resource.', 400));
    }
    // Pass other errors to general handler
    next(err);
  }
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Review owner or Admin)
exports.deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorResponse('Review not found', 404));
  }

  // Authorization: User must be the owner of the review OR an Admin
  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to delete this review', 401));
  }

  // Use deleteOne() to trigger the post hook that updates the average rating
  await review.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});