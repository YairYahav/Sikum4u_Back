const Review = require('../models/Review');
const Course = require('../models/Course');
const File = require('../models/File');

// @desc    Get reviews for a specific resource (Course or File)
// @route   GET /api/reviews?resourceId=...&resourceType=...
// @access  Public
exports.getReviews = async (req, res) => {
  const { resourceId, resourceType } = req.query;

  if (!resourceId || !resourceType) {
    return res.status(400).json({ message: 'Resource ID and Type are required' });
  }
  if (!['Course', 'File'].includes(resourceType)) {
      return res.status(400).json({ message: 'Invalid Resource Type' });
  }

  try {
    const reviews = await Review.find({ resourceId, resourceType }).populate({
      path: 'user',
      select: 'username firstName lastName profilePicture'
    });
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};


// @desc    Add a review (rating/comment) to a resource
// @route   POST /api/reviews
// @access  Private (Logged-in users)
exports.addReview = async (req, res) => {
  // auth() middleware ensures req.user exists
  req.body.user = req.user.id; 
  const { rating, comment, resourceId, resourceType } = req.body;

  try {
    if (!['Course', 'File'].includes(resourceType)) {
        return res.status(400).json({ message: 'Invalid Resource Type' });
    }

    // Check if the resource exists
    const Model = resourceType === 'Course' ? Course : File;
    const resource = await Model.findById(resourceId);

    if (!resource) {
      return res.status(404).json({ message: `${resourceType} not found` });
    }
    
    const review = await Review.create(req.body);

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (err) {
    // 11000 is usually a unique index error (user already reviewed)
    if (err.code === 11000) {
        return res.status(400).json({ message: 'You have already reviewed this resource.' });
    }
    res.status(400).json({ message: err.message });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Review owner or Admin)
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Authorization: User must be the owner of the review OR an Admin
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to delete this review' });
    }

    await review.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete review' });
  }
};