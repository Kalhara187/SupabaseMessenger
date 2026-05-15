const express = require('express');
const { body } = require('express-validator');
const {
  getMessages,
  createNewMessage,
  deleteMessage,
  seenMessage,
} = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/:chatId', getMessages);
router.post(
  '/',
  upload.single('media'),
  [
    body('chatId').notEmpty().isString(),
    body('messageType').optional().isIn(['text', 'image', 'video', 'voice', 'file']),
  ],
  validateRequest,
  createNewMessage
);
router.post('/seen', [body('chatId').notEmpty().isString()], validateRequest, seenMessage);
router.delete('/:id', deleteMessage);

module.exports = router;
