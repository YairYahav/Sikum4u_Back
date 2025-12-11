const Folder = require('../models/Folder');
const Course = require('../models/Course');
const File = require('../models/File');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse'); 
const mongoose = require('mongoose');

// @desc    Get folder content (sub-folders and files)
// @route   GET /api/folders/:id
// @access  Public
exports.getFolderContent = asyncHandler(async (req, res, next) => {
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new ErrorResponse('Invalid Folder ID format', 400));
    }
    
    const folder = await Folder.findById(req.params.id)
        .populate({
            path: 'subFolders',
            select: 'name createdAt' 
        })
        .populate({
            path: 'files',
            select: 'name url createdAt isFeatured' 
        });
    
    if (!folder) {
        return next(new ErrorResponse(`Folder not found with id of ${req.params.id}`, 404));
    }
    
    // Combine sub-folders and files into a single list for easy frontend rendering
    const content = [...folder.subFolders, ...folder.files];
    
    res.status(200).json({ success: true, data: { folder, content } });
});


// @desc    Create a new folder
// @route   POST /api/folders
// @access  Private/Admin
exports.createFolder = asyncHandler(async (req, res, next) => {
    req.body.uploadedBy = req.user.id;
    const { name, parentFolder, course } = req.body;
    let ParentModel, parentId, parentField; 

    // 1. Determine Parent (Course or Folder)
    if (parentFolder) {
        // Parent is another Folder
        const parent = await Folder.findById(parentFolder).select('course');
        if (!parent) {
            return next(new ErrorResponse('Parent folder not found', 404));
        }
        
        // Inherit course ID from parent folder
        req.body.course = parent.course; 
        
        ParentModel = Folder;
        parentId = parentFolder;
        parentField = 'subFolders';

    } else if (course) {
        // Parent is the Course itself (top-level)
        const courseCheck = await Course.findById(course).select('_id');
        if (!courseCheck) {
             return next(new ErrorResponse('Course not found', 404));
        }
        
        ParentModel = Course;
        parentId = course;
        parentField = 'folders';

    } else {
         return next(new ErrorResponse('Must link to a Course or a Parent Folder', 400));
    }

    // 2. Create the folder
    const newFolder = await Folder.create(req.body);

    // 3. Update the parent's children list
    await ParentModel.findByIdAndUpdate(
        parentId, 
        { $push: { [parentField]: newFolder._id } },
        { new: true, runValidators: true }
    );
    
    res.status(201).json({ success: true, data: newFolder });
});


// @desc    Update folder metadata (name, etc.)
// @route   PUT /api/folders/:id
// @access  Private/Admin
exports.updateFolder = asyncHandler(async (req, res, next) => {
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
        return next(new ErrorResponse(`Folder not found with id of ${req.params.id}`, 404));
    }

    // Authorization: User must be the uploader OR an Admin
    if (folder.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this folder', 401));
    }
    
    const updatedFolder = await Folder.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    
    res.status(200).json({ success: true, data: updatedFolder });
});


// @desc    Delete folder
// @route   DELETE /api/folders/:id
// @access  Private/Admin
exports.deleteFolder = asyncHandler(async (req, res, next) => {
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
        return next(new ErrorResponse(`Folder not found with id of ${req.params.id}`, 404));
    }

    // Authorization: User must be the uploader OR an Admin
    if (folder.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this folder', 401));
    }
    
    // The Folder pre('deleteOne') hook handles cascade deletion and parent cleanup
    await folder.deleteOne(); 

    res.status(200).json({ success: true, data: {} });
});