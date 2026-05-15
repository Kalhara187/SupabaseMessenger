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

const maybeUploadProfileImage = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return upload.single('profileImage')(req, res, next);
  }
  return next();
};

router.post(
  '/register',
  maybeUploadProfileImage,
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
