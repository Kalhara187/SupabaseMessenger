const { findUserById, updateProfile, listUsers } = require('../models/userModel');

const getUsers = async (req, res, next) => {
  try {
    const users = await listUsers(req.query.q || '');
    return res.json(users);
  } catch (error) {
    return next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

const updateUserById = async (req, res, next) => {
  try {
    const isOwner = Number(req.params.id) === req.user.id;
    if (!isOwner) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const payload = {
      full_name: req.body.fullName,
      username: req.body.username,
      bio: req.body.bio || null,
      profile_image: req.file ? `/uploads/${req.file.filename}` : req.body.profileImage || null,
    };

    const updated = await updateProfile(req.params.id, payload);
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUserById,
};
