const jwt = require('jsonwebtoken');
const User = require('../models/User'); // FIXED PATH
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../utils/asyncHandler'); // ADDED UTILITY
const ErrorResponse = require('../utils/ErrorResponse'); // ADDED UTILITY

// Rate limiting middleware: 5 requests per 10 minutes per IP for register/login
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { message: 'Too many attempts, please try again later.' }
});

// Password complexity regex: min 8 chars, at least 1 letter, 1 number
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
// Email regex: simple validation for format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Username regex: alphanumeric and underscores, 3-50 chars
const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;

exports.authLimiter = authLimiter;

exports.register = asyncHandler(async (req, res, next) => { // USED asyncHandler
    res.setHeader('Content-Type', 'application/json')
    let { username, firstName, lastName, email, password } = req.body; 
    email = email.toLowerCase().trim(); 
    console.log("Registering user:", { username, firstName, lastName, email });
    
    // Validate required fields
    if (!username || !firstName || !lastName || !email || !password) {
      return next(new ErrorResponse('All fields are required: username, firstName, lastName, email, password', 400));
    }

    // Validate username format
    if (!usernameRegex.test(username)) {
      return next(new ErrorResponse('Username must be 3-50 characters and contain only letters, numbers, and underscores', 400));
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      return next(new ErrorResponse('Please enter a valid email address', 400));
    }

    // Validate password complexity
    if (!passwordRegex.test(password)) {
      return next(new ErrorResponse('Password must be at least 8 characters and include at least one letter and one number', 400));
    }

    // Validate name lengths
    if (firstName.length > 50 || lastName.length > 50) {
      return next(new ErrorResponse('First name and last name must be 50 characters or less', 400));
    }

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return next(new ErrorResponse(`A user with this ${field} already exists`, 400));
    }

    const userData = {
      username,
      firstName,
      lastName,
      email,
      password
    };

    const user = new User(userData);
    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      token,
      message: 'User registered successfully'
    });

});


exports.login = asyncHandler(async (req, res, next) => { // USED asyncHandler
  let { email, password } = req.body;
  email = email.toLowerCase().trim(); 
  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

exports.checkAuth = asyncHandler(async (req, res, next) => { // USED asyncHandler
  // If no token was sent (guest user), req.user will be undefined
  if (!req.user) {
    return res.json({ 
        isAuthenticated: false, 
        message: 'User is not logged in' 
    });
  }

  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    return next(new ErrorResponse('User not found after authentication', 404));
  }
  
  res.json({ 
    isAuthenticated: true, 
    user: {
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      favoriteCourses: user.favoriteCourses,
      favoriteFiles: user.favoriteFiles
    }
  });
});