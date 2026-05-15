const express = require('express');
const { body } = require('express-validator');
const { listChats, findOrCreateChat, createNewChat } = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', listChats);
router.get('/find-or-create', findOrCreateChat);
router.post(
  '/',
  upload.single('groupImage'),
  [
    body('type').optional().isIn(['direct', 'group']),
    body('participantIds').custom((value) => {
      if (Array.isArray(value) && value.length > 0) {
        return true;
      }

      if (typeof value === 'string') {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) && parsed.length > 0;
      }

      throw new Error('participantIds must be a non-empty array');
    }),
    body('title').optional().isLength({ min: 2 }),
  ],
  validateRequest,
  createNewChat
);

module.exports = router;
