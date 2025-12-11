const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary'); 

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  // Type is implicitly 'document' now
  url: {
    type: String, // Public URL for the document (Cloudinary, S3, etc.)
    required: true 
  },
  cloudinaryId: {
    type: String, // ID for managing the file on Cloudinary
    required: true 
  },
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder', // Reference to the parent folder
    default: null // Can be null if file is direct child of Course (see Course model)
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course', // Direct link to the main course
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field to get reviews for this file/document
fileSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'resourceId',
  justOne: false,
  match: { resourceType: 'File' }
});

// Cascade delete reviews and delete from Cloudinary when a file is deleted
fileSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    // 1. Delete related Reviews
    await this.model('Review').deleteMany({ resourceId: this._id, resourceType: 'File' });

    // 2. Delete from Cloudinary
    if (this.cloudinaryId) {
        await cloudinary.uploader.destroy(this.cloudinaryId, { resource_type: 'raw' });
    }
    
    // 3. Remove reference from parent (Folder or Course)
    const ParentModel = this.parentFolder ? this.model('Folder') : this.model('Course');
    const parentId = this.parentFolder || this.course;
    
    // Pull the reference of this file from its parent's 'files' array
    await ParentModel.updateOne(
        { _id: parentId },
        { $pull: { files: this._id } }
    );

    next();
});

module.exports = mongoose.model('File', fileSchema);