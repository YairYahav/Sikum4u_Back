const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload'); // Import upload middleware
const fileController = require('../controllers/fileController');
const auth = require('../middleware/auth'); // Import auth middleware

// Routes
// Public routes (no API key needed)
router.get('/', fileController.getFiles); // Use query params: /api/files?parentId=...
router.get('/:id', fileController.getFileById);
router.get('/:id/full', fileController.getFullResFile); // שונה לנגישות ציבורית

// Admin routes (API key required)
// POST for creating a folder (no upload) or uploading a file (with upload)
router.post('/', auth(['admin']), upload.single('file'), fileController.createFile); 
router.put('/:id', auth(['admin']), upload.none(), fileController.updateFile);
router.delete('/:id', auth(['admin']), fileController.deleteFile);


module.exports = router;