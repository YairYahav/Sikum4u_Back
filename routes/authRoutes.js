const express = require('express');
const router = express.Router();
const { register, login, authLimiter, checkAuth } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/check', auth(), checkAuth);

module.exports = router;