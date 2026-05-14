const express = require('express');
const { body } = require('express-validator');
const { getUsers, getUserById, updateUserById } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put(
  '/:id',
  upload.single('profileImage'),
  [
    body('fullName').optional().isLength({ min: 2 }),
    body('username').optional().isLength({ min: 3 }),
  ],
  validateRequest,
  updateUserById
);

module.exports = router;
