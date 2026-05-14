const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  createUser,
  findUserByEmail,
  findUserById,
  updateOnlineStatus,
} = require('../models/userModel');

const signToken = (user) => jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
});

const register = async (req, res, next) => {
  try {
    const { fullName, username, email, password } = req.body;
    const existing = await findUserByEmail(email);

    if (existing) {
      return res.status(409).json({ message: 'Email is already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const profileImage = req.file ? `/uploads/${req.file.filename}` : null;

    const userId = await createUser({
      fullName,
      username,
      email,
      password: hashedPassword,
      profileImage,
    });

    const user = await findUserById(userId);
    const token = signToken({ id: userId, email });

    return res.status(201).json({ token, user });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await updateOnlineStatus(user.id, true);

    const token = signToken(user);
    const profile = await findUserById(user.id);

    return res.json({ token, user: profile });
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await updateOnlineStatus(req.user.id, false);
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    return next(error);
  }
};

const profile = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (req, res) => {
  return res.json({
    message: 'Forgot password flow placeholder. Integrate email OTP or reset token service.',
  });
};

module.exports = {
  register,
  login,
  logout,
  profile,
  forgotPassword,
};
