const express = require('express');
const router = express.Router();
const { getReviews, addReview, deleteReview } = require('../controllers/reviewController');
const auth = require('../middleware/auth');

// Public route to get all reviews for a resource
router.get('/', getReviews); 

// Private routes (requires logged-in user)
router.post('/', auth(), addReview); 
router.delete('/:id', auth(), deleteReview); // Delete only by owner or admin

module.exports = router;