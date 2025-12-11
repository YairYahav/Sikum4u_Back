const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const auth = require('../middleware/auth'); 

// Public route to get folder content
router.get('/:id', folderController.getFolderContent); 

// Admin routes (API key required)
// POST for creating a folder (no upload middleware needed)
router.post('/', auth(['admin']), folderController.createFolder); 
router.put('/:id', auth(['admin']), folderController.updateFolder);
router.delete('/:id', auth(['admin']), folderController.deleteFolder);

module.exports = router;