const User = require('../models/User');
const Course = require('../models/Course');
const File = require('../models/File');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

// @desc    Get current logged in user
// @route   GET /api/users/me
// @access  Private
exports.getCurrentUser = asyncHandler(async (req, res, next) => {
    // req.user is set by auth() middleware
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    // Returning user data based on the schema in modles/User.js
    res.status(200).json({
        success: true,
        data: {
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

// @desc    Update user profile picture (Placeholder - requires image upload setup)
// @route   PUT /api/users/me/profilePicture
// @access  Private
exports.updateProfilePicture = asyncHandler(async (req, res, next) => {
    // NOTE: This route assumes the client sends the new URL or a file that the client already uploaded. 
    // If you plan to use this route to handle file upload, you need to add an upload middleware here.
    const { profilePictureUrl } = req.body; 
    
    const user = await User.findByIdAndUpdate(req.user.id, { profilePicture: profilePictureUrl }, {
        new: true,
        runValidators: true
    }).select('-password');

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({ success: true, data: user });
});

// @desc    Update user first name
// @route   PUT /api/users/me/firstname
// @access  Private
exports.updateFirstName = asyncHandler(async (req, res, next) => {
    const { firstName } = req.body;
    if (!firstName || firstName.length > 50) {
        return next(new ErrorResponse('Invalid first name length', 400));
    }
    
    const user = await User.findByIdAndUpdate(req.user.id, { firstName }, {
        new: true,
        runValidators: true
    }).select('-password');
    
    res.status(200).json({ success: true, data: user });
});

// @desc    Update user last name
// @route   PUT /api/users/me/lastname
// @access  Private
exports.updateLastName = asyncHandler(async (req, res, next) => {
    const { lastName } = req.body;
    if (!lastName || lastName.length > 50) {
        return next(new ErrorResponse('Invalid last name length', 400));
    }

    const user = await User.findByIdAndUpdate(req.user.id, { lastName }, {
        new: true,
        runValidators: true
    }).select('-password');
    
    res.status(200).json({ success: true, data: user });
});

// @desc    Update user username
// @route   PUT /api/users/me/username
// @access  Private
exports.updateUsername = asyncHandler(async (req, res, next) => {
    const { username } = req.body;
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    
    if (!usernameRegex.test(username)) {
        return next(new ErrorResponse('Username must be 3-50 characters and contain only letters, numbers, and underscores', 400));
    }

    const user = await User.findById(req.user.id);
    
    // Check for existing username only if it changed
    if (user.username !== username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return next(new ErrorResponse('Username already taken', 400));
        }
    }
    
    user.username = username;
    await user.save();
    
    res.status(200).json({ success: true, data: user.toJSON() });
});

// @desc    Update user password
// @route   PUT /api/users/me/password
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;

    if (!currentPassword || !newPassword) {
        return next(new ErrorResponse('Current password and new password are required', 400));
    }
    if (!passwordRegex.test(newPassword)) {
        return next(new ErrorResponse('Password must be at least 8 characters and include at least one letter and one number', 400));
    }

    const user = await User.findById(req.user.id);
    
    if (!(await user.comparePassword(currentPassword))) {
        return next(new ErrorResponse('Current password is incorrect', 401));
    }
    
    user.password = newPassword; // Pre-save hook will hash it
    await user.save();
    
    res.status(200).json({ success: true, message: 'Password updated successfully' });
});

// @desc    Get user favorite items (Courses and Files)
// @route   GET /api/users/me/favorites
// @access  Private
exports.getFavorites = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id)
        .populate('favoriteCourses')
        .populate('favoriteFiles');

    res.status(200).json({
        success: true,
        data: {
            courses: user.favoriteCourses,
            files: user.favoriteFiles
        }
    });
});

// @desc    Add/Remove favorite item
// @route   PUT /api/users/me/favorites
// @access  Private
exports.updateFavorites = asyncHandler(async (req, res, next) => {
    const { resourceId, resourceType, action } = req.body; // action: 'add' or 'remove'
    
    if (!resourceId || !resourceType || !action || !['add', 'remove'].includes(action)) {
        return next(new ErrorResponse('Invalid request body for updating favorites', 400));
    }
    
    const isCourse = resourceType === 'Course';
    const field = isCourse ? 'favoriteCourses' : 'favoriteFiles';
    
    let updateOperation = {};
    if (action === 'add') {
        updateOperation = { $addToSet: { [field]: resourceId } };
    } else {
        updateOperation = { $pull: { [field]: resourceId } };
    }

    const user = await User.findByIdAndUpdate(req.user.id, updateOperation, {
        new: true
    }).select('-password');
    
    res.status(200).json({ 
        success: true, 
        message: action === 'add' ? 'Added to favorites' : 'Removed from favorites',
        data: user.toJSON()
    });
});

// Placeholder for DELETE route to fulfill existing path definition
exports.removeFavorite = asyncHandler(async (req, res, next) => {
    return next(new ErrorResponse('Please use the PUT /api/users/me/favorites route for clear add/remove operations.', 405));
});