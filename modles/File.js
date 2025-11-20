const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  type: {
    type: String,
    enum: ['folder', 'document'], // A node can be a folder or a final document
    required: true
  },
  url: {
    type: String, // Public URL for the document (Cloudinary, S3, etc.)
    required: function() { return this.type === 'document'; } // Only required for documents
  },
  cloudinaryId: {
    type: String, // ID for managing the file on Cloudinary
    required: function() { return this.type === 'document'; } 
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File', // Self-reference for nested folders
    default: null
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course', // Direct link to the main course
    required: true
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File' // Documents/Folders inside this folder
  }],
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

// Virtual field to get reviews for this file/folder
fileSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'resourceId',
  justOne: false,
  match: { resourceType: 'File' }
});

module.exports = mongoose.model('File', fileSchema);
