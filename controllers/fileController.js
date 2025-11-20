const File = require('../models/File'); // FIXED PATH
const Course = require('../models/Course'); // FIXED PATH
const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse'); 

// @desc    Get content (files/folders) of a parent (Course or Folder)
// @route   GET /api/files?parentId=...
// @access  Public
exports.getFiles = asyncHandler(async (req, res, next) => {
    const { parentId } = req.query; // parentId is a Course ID or a Folder ID

    let children;
    
    if (parentId) {
        // If parentId is provided, check if it's a Course or a File (Folder)
        const parentFile = await File.findById(parentId).select('children type');
        if (parentFile) {
            if (parentFile.type !== 'folder') {
                return next(new ErrorResponse('Parent ID must be a folder', 400));
            }
            // Fetch children of the folder
            children = await File.find({ parent: parentId }).select('name type url createdAt');
        } else {
            // Check if it's a Course
            const course = await Course.findById(parentId).select('children');
            if (course) {
                 // Fetch children of the course (top-level)
                children = await File.find({ course: parentId, parent: null }).select('name type url createdAt');
            } else {
                return next(new ErrorResponse('Parent resource not found', 404));
            }
        }
    } else {
        // No parentId - return featured items
        children = await File.find({ isFeatured: true }).select('name type url createdAt course').populate('course', 'name');
    }

    res.status(200).json({ success: true, count: children.length, data: children });
});

// @desc    Get single file/folder details
// @route   GET /api/files/:id
// @access  Public
exports.getFileById = asyncHandler(async (req, res, next) => {
    const file = await File.findById(req.params.id)
        .populate('reviews')
        .select('-cloudinaryId'); // Don't expose cloudinary ID
    
    if (!file) {
        return next(new ErrorResponse(`File/Folder not found with id of ${req.params.id}`, 404));
    }
    
    res.status(200).json({ success: true, data: file });
});

// @desc    Get full resolution/direct link for file (Public access for documents)
// @route   GET /api/files/:id/full
// @access  Public
exports.getFullResFile = asyncHandler(async (req, res, next) => {
    const file = await File.findById(req.params.id).select('type url cloudinaryId');
    
    if (!file || file.type !== 'document') {
        return next(new ErrorResponse('Document not found or is a folder', 404));
    }
    
    // The client can now use this URL to display the PDF/document
    res.status(200).json({ success: true, url: file.url });
});

// @desc    Create a new file (document upload) or a folder
// @route   POST /api/files
// @access  Private/Admin
exports.createFile = asyncHandler(async (req, res, next) => {
    req.body.uploadedBy = req.user.id;
    let { name, type, parent, course } = req.body;

    // 1. Validate Parent/Course existence and determine final Course ID
    if (parent) {
        const parentFile = await File.findById(parent).select('type course');
        if (!parentFile || parentFile.type !== 'folder') {
            return next(new ErrorResponse('Invalid parent ID: must be a folder', 400));
        }
        // Inherit course ID from parent folder if not explicitly provided
        course = course || parentFile.course; 

    } else if (!course) {
        return next(new ErrorResponse('Must link to a Course or a Parent Folder', 400));
    }

    // Final course validation
    const courseCheck = await Course.findById(course).select('_id');
    if (!courseCheck) {
         return next(new ErrorResponse('Course not found', 404));
    }

    // 2. Handle Folder Creation (No file upload needed)
    if (type === 'folder') {
        const newFolder = await File.create({ name, type, parent, course, uploadedBy: req.body.uploadedBy });
        return res.status(201).json({ success: true, data: newFolder });
    }

    // 3. Handle Document Upload (requires `upload.single('file')` middleware)
    if (type === 'document') {
        if (!req.file) {
            return next(new ErrorResponse('Document file is required for type "document"', 400));
        }
        
        // Name defaults to the file's original name if not provided in body
        const finalName = name || req.file.originalname;

        const newDocument = await File.create({
            name: finalName, 
            type: 'document',
            url: req.file.path, // Path from Cloudinary storage
            cloudinaryId: req.file.filename, // Filename from Cloudinary storage
            parent,
            course,
            uploadedBy: req.body.uploadedBy
        });
        
        return res.status(201).json({ success: true, data: newDocument });
    }

    return next(new ErrorResponse('Invalid file type or request', 400));
});


// @desc    Update file/folder metadata
// @route   PUT /api/files/:id
// @access  Private/Admin
exports.updateFile = asyncHandler(async (req, res, next) => {
    const file = await File.findById(req.params.id);
    
    if (!file) {
        return next(new ErrorResponse(`File/Folder not found with id of ${req.params.id}`, 404));
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


// @desc    Delete file/folder
// @route   DELETE /api/files/:id
// @access  Private/Admin
exports.deleteFile = asyncHandler(async (req, res, next) => {
    const file = await File.findById(req.params.id);
    
    if (!file) {
        return next(new ErrorResponse(`File/Folder not found with id of ${req.params.id}`, 404));
    }

    // Authorization: User must be the uploader OR an Admin
    if (file.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this file', 401));
    }

    // For folders, prevent deletion if children exist
    if (file.type === 'folder' && file.children.length > 0) {
         return next(new ErrorResponse('Folder must be empty to be deleted', 400));
    }

    // Use deleteOne() to trigger the pre('deleteOne') hook
    await file.deleteOne(); 

    res.status(200).json({ success: true, data: {} });
});