const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Create a storage engine for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'sikum4u_files', // Root folder on Cloudinary
        resource_type: 'raw', // To allow all file types (PDF, DOCX, etc.)
        format: async (req, file) => {
            // Extract extension from file mimetype or name
            const extension = file.mimetype.split('/')[1] || file.originalname.split('.').pop();
            return extension;
        },
        public_id: (req, file) => `${Date.now()}-${file.originalname}`,
    },
});

// Configure multer
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 20 } // Max file size 20MB
});

module.exports = upload;