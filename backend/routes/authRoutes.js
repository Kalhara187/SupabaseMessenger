const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  profile,
  forgotPassword,
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post(
  '/register',
  upload.single('profileImage'),
  [
    body('fullName').trim().isLength({ min: 2 }),
    body('username').trim().isLength({ min: 3 }),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
  ],
  validateRequest,
  register
);

router.post(
  '/login',
  [body('email').isEmail(), body('password').isLength({ min: 6 })],
  validateRequest,
  login
);

router.post('/logout', authMiddleware, logout);
router.get('/profile', authMiddleware, profile);
router.post('/forgot-password', [body('email').isEmail()], validateRequest, forgotPassword);

module.exports = router;
