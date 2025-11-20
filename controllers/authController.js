const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');

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

exports.register = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json')
    const { username, firstName, lastName, email, password } = req.body;
    email = email.toLowerCase().trim(); 
    console.log("Registering user:", { username, firstName, lastName, email });
    // Validate required fields
    if (!username || !firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: 'All fields are required: username, firstName, lastName, email, password'
      });
    }

    // Validate username format
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        message: 'Username must be 3-50 characters and contain only letters, numbers, and underscores'
      });
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address'
      });
    }

    // Validate password complexity
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include at least one letter and one number'
      });
    }

    // Validate name lengths (should match your schema maxlength: 50)
    if (firstName.length > 50 || lastName.length > 50) {
      return res.status(400).json({
        message: 'First name and last name must be 50 characters or less'
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(400).json({
        message: `A user with this ${field} already exists`
      });
    }

    // Create user object (profilePicture will be undefined and handled by schema)
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

  } catch (err) {
    console.error('Registration error:', err);
    
    // Handle specific MongoDB errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        message: `A user with this ${field} already exists`
      });
    }

    res.status(400).json({ 
      message: 'Registration failed', 
      error: err.message 
    });
  }
};

exports.login = async (req, res) => {
  let { email, password } = req.body;
  email = email.toLowerCase().trim(); 
  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
};

exports.checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ 
        isAuthenticated: false, 
        message: 'User not found' 
      });
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
        profilePicture: user.profilePicture,
        favoritePhotos: user.favoritePhotos,
        favoriteProducts: user.favoriteProducts
      }
    });
  } catch (err) {
    console.error('Auth check error:', err);
    res.status(500).json({ 
      isAuthenticated: false, 
      message: 'Server error during authentication check' 
    });
  }
};