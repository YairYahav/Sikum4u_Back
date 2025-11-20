const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary'); // ADDED IMPORT for pre-hook

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true,
    maxlength: [100, 'Course name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  isFeatured: {
    type: Boolean,
    default: false // For the scrolling list on the homepage
  },
  // This will hold the direct files and folders within the course
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File' 
  }],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field to get average rating
courseSchema.virtual('averageRating').get(function() {
  return this.averageRating || 0; // Ensures a default value of 0 is returned if no rating exists
});

// Reverse populate with reviews
courseSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'resourceId',
  justOne: false,
  match: { resourceType: 'Course' }
});

// Cascade delete files and reviews when a course is deleted
courseSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    console.log(`Files and Reviews being removed from course ${this._id}`);
    
    // 1. Delete all related Reviews
    await this.model('Review').deleteMany({ resourceId: this._id, resourceType: 'Course' });

    // 2. Find and delete all related Files (which also includes sub-folders)
    const allFilesToDelete = await this.model('File').find({ course: this._id }); 
    
    // Delete Cloudinary files for documents
    for (const file of allFilesToDelete) {
        if (file.type === 'document' && file.cloudinaryId) {
            await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: 'raw' });
        }
    }
    
    // Delete all File/Folder entries
    await this.model('File').deleteMany({ course: this._id });

    next();
});


module.exports = mongoose.model('Course', courseSchema);