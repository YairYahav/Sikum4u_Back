const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary'); 

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
    default: false 
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    set: val => Math.round(val * 10) / 10 
  },
  // UPDATED: Hold top-level folders
  folders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder' 
  }],
  // UPDATED: Hold top-level files (Documents) directly in the course
  files: [{
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

// Reverse populate with reviews
courseSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'resourceId',
  justOne: false,
  match: { resourceType: 'Course' }
});

// Cascade delete: delete all folders and files associated with the course
courseSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    console.log(`Resources being removed from course ${this._id}`);
    
    const Folder = this.model('Folder');
    const File = this.model('File');

    // 1. Delete all related Reviews (Course reviews)
    await this.model('Review').deleteMany({ resourceId: this._id, resourceType: 'Course' });

    // 2. Recursively delete all top-level folders (which cascades to sub-folders and their files via Folder pre-hook)
    // We only need to target top-level folders that reference this course
    await Folder.deleteMany({ _id: { $in: this.folders } });
    
    // 3. Delete all top-level files directly under the course (The file delete hook handles reviews/cloudinary)
    await File.deleteMany({ _id: { $in: this.files } }); 

    next();
});


module.exports = mongoose.model('Course', courseSchema);