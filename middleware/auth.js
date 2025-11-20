const jwt = require('jsonwebtoken');
const User = require('../models/User'); // FIXED PATH

/**
 * Middleware for authenticating a user via JWT and optionally checking their role.
 * * Usage: 
 * auth() - Requires login, any role is fine.
 * auth(['admin']) - Requires login and 'admin' role.
 */
const auth = (roles = []) => async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    // For public routes, if no token, just continue (user is a guest)
    if (roles.length === 0) {
      return next(); 
    }
    // If roles are required, return 401
    return res.status(401).json({ message: 'Not authorized to access this route. Token missing.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user information to the request
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
        return res.status(401).json({ message: 'User not found or token invalid' });
    }
    req.user = user;

    // Check for role-based authorization
    if (roles.length > 0 && !roles.includes(user.role)) {
      return res.status(403).json({ 
        message: `User role ${user.role} is not authorized to access this route` 
      });
    }

    next();

  } catch (err) {
    console.error('JWT Error:', err.message);
    res.status(401).json({ message: 'Not authorized to access this route. Token failed or expired.' });
  }
};

module.exports = auth;