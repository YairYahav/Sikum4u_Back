const File = require('../models/File'); 
const Folder = require('../models/Folder'); 
const Course = require('../models/Course'); 
const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse'); 

// @desc    Get featured files (documents)
// @route   GET /api/files
// @access  Public
exports.getFiles = asyncHandler(async (req, res, next) => {
    // Only return featured documents here, for hierarchy use Course/Folder routes
    const files = await File.find({ isFeatured: true }).select('name url createdAt course').populate('course', 'name');

    res.status(200).json({ success: true, count: files.length, data: files });
});

// @desc    Get single file details
// @route   GET /api/files/:id
// @access  Public
exports.getFileById = asyncHandler(async (req, res, next) => {
    const file = await File.findById(req.params.id)
        .populate('reviews')
        .select('-cloudinaryId'); 
    
    if (!file) {
        return next(new ErrorResponse(`File/Document not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({ success: true, data: file });
});

// @desc    Get full resolution/direct link for file (Public access for documents)
// @route   GET /api/files/:id/full
// @access  Public
exports.getFullResFile = asyncHandler(async (req, res, next) => {
    const file = await File.findById(req.params.id).select('url');
    
    if (!file) {
        return next(new ErrorResponse('Document not found', 404));
    }
    
    res.status(200).json({ success: true, url: file.url });
});

// @desc    Create a new document
// @route   POST /api/files
// @access  Private/Admin
exports.createFile = asyncHandler(async (req, res, next) => {
    req.body.uploadedBy = req.user.id;
    const { name, parentFolder, course } = req.body;

    let parentId, ParentModel;
    
    // 1. Determine Parent (Folder or Course)
    if (parentFolder) {
        // Parent is a Folder
        const parent = await Folder.findById(parentFolder).select('course');
        if (!parent) {
            return next(new ErrorResponse('Parent folder not found', 404));
        }
        
        // Inherit course ID
        req.body.course = parent.course.toString(); 
        parentId = parentFolder;
        ParentModel = Folder;
    } else if (course) {
        // Parent is the Course
        const courseCheck = await Course.findById(course).select('_id');
        if (!courseCheck) {
             return next(new ErrorResponse('Course not found', 404));
        }
        parentId = course;
        ParentModel = Course;
    } else {
        return next(new ErrorResponse('Document must be linked to a Parent Folder or a Course', 400));
    }


    // 2. Handle Document Upload (requires `upload.single('file')` middleware)
    if (!req.file) {
        return next(new ErrorResponse('Document file is required', 400));
    }
    
    // Name defaults to the file's original name if not provided in body
    const finalName = name || req.file.originalname;

    const newDocument = await File.create({
        name: finalName, 
        url: req.file.path, 
        cloudinaryId: req.file.filename, 
        parentFolder: parentFolder || null, // If parent is Course, this is null
        course: req.body.course,
        uploadedBy: req.body.uploadedBy
    });
    
    // 3. Update the parent's 'files' array
    await ParentModel.findByIdAndUpdate(
        parentId, 
        { $push: { files: newDocument._id } },
        { new: true, runValidators: true }
    );
    
    return res.status(201).json({ success: true, data: newDocument });
});


// @desc    Update file metadata
// @route   PUT /api/files/:id
// @access  Private/Admin
exports.updateFile = asyncHandler(async (req, res, next) => {
    const file = await File.findById(req.params.id);
    
    if (!file) {
        return next(new ErrorResponse(`File/Document not found with id of ${req.params.id}`, 404));
    }

    // Authorization: User must be the uploader OR an Admin
    if (file.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this file', 401));
    }
    
    const updatedFile = await File.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    
    res.status(200).json({ success: true, data: updatedFile });
});


// @desc    Delete file
// @route   DELETE /api/files/:id
// @access  Private/Admin
exports.deleteFile = asyncHandler(async (req, res, next) => {
    const file = await File.findById(req.params.id);
    
    if (!file) {
        return next(new ErrorResponse(`File/Document not found with id of ${req.params.id}`, 404));
    }

    // Authorization: User must be the uploader OR an Admin
    if (file.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this file', 401));
    }

    // Use deleteOne() to trigger the pre('deleteOne') hook 
    await file.deleteOne(); 

    res.status(200).json({ success: true, data: {} });
});