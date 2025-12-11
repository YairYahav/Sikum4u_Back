const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload'); 
const fileController = require('../controllers/fileController');
const auth = require('../middleware/auth'); 

// Routes
// Public routes (no API key needed)
// GET /api/files now returns only featured files. Use /api/folders/:id for folder content
router.get('/', fileController.getFiles); 
router.get('/:id', fileController.getFileById);
router.get('/:id/full', fileController.getFullResFile); 

// Admin routes (API key required)
// POST for uploading a DOCUMENT only (requires 'file' upload)
router.post('/', auth(['admin']), upload.single('file'), fileController.createFile); 
router.put('/:id', auth(['admin']), upload.none(), fileController.updateFile);
router.delete('/:id', auth(['admin']), fileController.deleteFile);


module.exports = router;