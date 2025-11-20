const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const fileController = require('../controllers/fileController');
const auth = require('../middleware/auth');

// Routes
// Public routes (no API key needed)
router.get('/', fileController.getFiles);
router.get('/featured', fileController.getFeaturedFiles); // Get featured files
router.get('/:id', fileController.getFileById);

// Admin routes (API key required)
router.post('/', auth(['admin']), upload.single('file'), fileController.createFile);
router.put('/:id',auth(['admin']), upload.none(), fileController.updateFile);
router.delete('/:id',auth(['admin']), fileController.deleteFile);
router.get('/:id/full',auth(['admin']), fileController.getFullResFile); // Full res access
module.exports = router;