const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Checkpoint = require('../models/Checkpoint');
const Room = require('../models/Room');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-123';

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Create a checkpoint
// Saves a new checkpoint and automatically keeps only the last 50
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { roomId, content, type, language, label } = req.body;
    if (!roomId || !content || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const checkpoint = new Checkpoint({
      roomId,
      content,
      type,
      author: req.user.username,
      language: language || 'javascript',
      label: label || (type === 'manual' ? 'Manual Save' : type === 'auto' ? 'Auto-save' : 'Pre-execution')
    });

    await checkpoint.save();

    // Cleanup: keep latest 50
    const count = await Checkpoint.countDocuments({ roomId });
    if (count > 50) {
      const oldest = await Checkpoint.find({ roomId }).sort({ createdAt: 1 }).limit(count - 50);
      const idsToDelete = oldest.map(d => d._id);
      await Checkpoint.deleteMany({ _id: { $in: idsToDelete } });
    }

    res.status(201).json(checkpoint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all checkpoints for a room
router.get('/:roomId', authMiddleware, async (req, res) => {
  try {
    const checkpoints = await Checkpoint.find({ roomId: req.params.roomId }).sort({ createdAt: -1 });
    res.json(checkpoints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore a checkpoint
// Broadcasts the 'restore-checkpoint' event via Socket.io to all users in the room
router.post('/restore/:id', authMiddleware, async (req, res) => {
  try {
    const checkpoint = await Checkpoint.findById(req.params.id);
    if (!checkpoint) return res.status(404).json({ error: 'Checkpoint not found' });

    const io = req.app.get('io');
    if (io) {
      io.to(checkpoint.roomId).emit('restore-checkpoint', {
        content: checkpoint.content,
        label: checkpoint.label,
        restoredBy: req.user.username
      });
    }

    res.json({ message: 'Checkpoint restored successfully', checkpoint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
