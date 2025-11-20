const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const auth = require('../middleware/auth'); // Import auth middleware

// Public routes
router.get('/', courseController.getCourses);
router.get('/featured', courseController.getFeaturedCourses); // Get featured courses
router.get('/:id', courseController.getCourseById);

// Admin routes (API key required)
router.post('/', auth(['admin']), courseController.createCourse);
router.put('/:id', auth(['admin']), courseController.updateCourse);
router.delete('/:id', auth(['admin']), courseController.deleteCourse);

// Export the router
module.exports = router;