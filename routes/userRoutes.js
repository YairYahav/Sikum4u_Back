const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Routes
router.get('/me', auth(), userController.getCurrentUser);
router.put('/me/profilePicture', auth(), userController.updateProfilePicture);
router.put('/me/firstname', auth(), userController.updateFirstName);
router.put('/me/lastname', auth(), userController.updateLastName);
router.put('/me/username', auth(), userController.updateUsername);
router.put('/me/password', auth(), userController.updatePassword);
router.get('/me/favorites', auth(), userController.getFavorites);
router.get('/me/favorites/:id', auth(), userController.getFavorites);
router.put('/me/favorites', auth(), userController.updateFavorites);
router.delete('/me/favorites/:id', auth(), userController.removeFavorite);

module.exports = router;