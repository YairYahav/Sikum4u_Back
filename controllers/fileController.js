const File = require('../models/File');
const Course = require('../models/Course');
const cloudinary = require('../config/cloudinary');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

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
                return res.status(400).json({ message: 'Parent ID must be a folder' });
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
                return res.status(404).json({ message: 'Parent resource not found' });
            }
        }
    } else {
        // No parentId - maybe featured files only? 
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
        return res.status(404).json({ message: `File/Folder not found with id of ${req.params.id}` });
    }
    
    res.status(200).json({ success: true, data: file });
});

// @desc    Get full resolution/direct link for file (Admin/Private access)
// @route   GET /api/files/:id/full
// @access  Private/Admin
exports.getFullResFile = asyncHandler(async (req, res, next) => {
    const file = await File.findById(req.params.id).select('type url cloudinaryId');
    
    if (!file || file.type !== 'document') {
        return res.status(404).json({ message: 'Document not found or is a folder' });
    }
    
    // Cloudinary can generate a secure URL if needed, or you can return the stored URL
    res.status(200).json({ success: true, url: file.url });
});

// @desc    Create a new file (document upload) or a folder
// @route   POST /api/files
// @access  Private/Admin
exports.createFile = asyncHandler(async (req, res, next) => {
    req.body.uploadedBy = req.user.id;
    const { name, type, parent, course } = req.body;

    // 1. Validate Parent/Course existence and type
    if (parent) {
        const parentFile = await File.findById(parent).select('type');
        if (!parentFile || parentFile.type !== 'folder') {
            return res.status(400).json({ message: 'Invalid parent ID: must be a folder' });
        }
    } else if (!course) {
        return res.status(400).json({ message: 'Must link to a Course or a Parent Folder' });
    }

    // 2. Handle Folder Creation (No file upload needed)
    if (type === 'folder') {
        const newFolder = await File.create({ name, type, parent, course, uploadedBy: req.body.uploadedBy });
        return res.status(201).json({ success: true, data: newFolder });
    }

    // 3. Handle Document Upload (requires `upload.single('file')` middleware)
    if (type === 'document') {
        if (!req.file) {
            return res.status(400).json({ message: 'Document file is required for type "document"' });
        }
        
        const newDocument = await File.create({
            name: req.file.originalname, // Use original name from upload for simplicity
            type: 'document',
            url: req.file.path, // Path from Cloudinary storage
            cloudinaryId: req.file.filename, // Filename from Cloudinary storage
            parent,
            course,
            uploadedBy: req.body.uploadedBy
        });
        
        return res.status(201).json({ success: true, data: newDocument });
    }

    res.status(400).json({ message: 'Invalid file type or request' });
});


// @desc    Update file/folder metadata
// @route   PUT /api/files/:id
// @access  Private/Admin
exports.updateFile = asyncHandler(async (req, res, next) => {
    const file = await File.findById(req.params.id);
    
    if (!file) {
        return res.status(404).json({ message: `File/Folder not found with id of ${req.params.id}` });
    }

    // You might want to prevent changing 'type' if a file has children.
    
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
        return res.status(404).json({ message: `File/Folder not found with id of ${req.params.id}` });
    }

    // For documents, delete from Cloudinary
    if (file.type === 'document' && file.cloudinaryId) {
        await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: 'raw' });
    }
    
    // For folders, you should recursively delete children first or prevent deletion if children exist
    if (file.type === 'folder' && file.children.length > 0) {
         return res.status(400).json({ message: 'Folder must be empty to be deleted' });
    }

    await file.deleteOne();

    res.status(200).json({ success: true, data: {} });
});