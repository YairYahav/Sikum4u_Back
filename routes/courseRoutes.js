const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

// Routes
// Public routes
router.get('/', courseController.getCourses);
router.get('/featured', courseController.getFeaturedCourses); // Get featured courses
router.get('/:id', courseController.getCourseById);

// Admin routes (API key required)
router.post('/', courseController.createCourse);
router.put('/:id', courseController.updateCourse);
router.delete('/:id', courseController.deleteCourse);

// Export the router
module.exports = router;