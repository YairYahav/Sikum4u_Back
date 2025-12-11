const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
    maxlength: [100, 'Folder name cannot be more than 100 characters']
  },
  parentFolder: { // Reference to parent Folder (for nested folders)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  course: { // Direct link to the main course
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  // Children arrays (can reference other folders or documents/Files)
  subFolders: [{ 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder' 
  }],
  files: [{ // Documents (Files) inside this folder
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File' 
  }],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Cascade delete: when a folder is deleted, delete its children and remove reference from parent
folderSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    const Folder = this.model('Folder');
    const File = this.model('File');
    const Course = this.model('Course');

    // 1. Recursively delete all sub-folders (will trigger this hook again for each one)
    for (const subFolderId of this.subFolders) {
        const subFolder = await Folder.findById(subFolderId);
        if (subFolder) {
             await subFolder.deleteOne(); 
        }
    }

    // 2. Delete all files inside this folder (the File pre-hook handles reviews/cloudinary cleanup)
    await File.deleteMany({ _id: { $in: this.files } });

    // 3. Remove reference from parent (Course or Folder)
    const ParentModel = this.parentFolder ? Folder : Course;
    const parentId = this.parentFolder || this.course;
    
    // Determine the field to pull from in the parent
    const fieldToPull = this.parentFolder ? 'subFolders' : 'folders'; 
    
    await ParentModel.updateOne(
        { _id: parentId },
        { $pull: { [fieldToPull]: this._id } }
    );

    next();
});

module.exports = mongoose.model('Folder', folderSchema);