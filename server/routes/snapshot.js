const express = require('express');
const router = express.Router();
const Snapshot = require('../models/Snapshot');
const Room = require('../models/Room');
const jwt = require('jsonwebtoken');

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

// Create a snapshot
router.post('/:roomId', authMiddleware, async (req, res) => {
  try {
    const { content, label } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    // Check if user is participant
    const isParticipant = room.participants.some(p => p.userId.toString() === req.user.userId);
    if (!isParticipant) return res.status(403).json({ error: 'Not a participant' });

    const recentSnapshots = await Snapshot.countDocuments({ roomId: req.params.roomId });
    // Keep only last 50 snapshots
    if (recentSnapshots >= 50) {
       const oldest = await Snapshot.find({ roomId: req.params.roomId }).sort('createdAt').limit(1);
       if (oldest.length) {
         await Snapshot.findByIdAndDelete(oldest[0]._id);
       }
    }

    const snapshot = new Snapshot({
      roomId: req.params.roomId,
      content,
      authorName: req.user.username,
      label: label || 'Manual Save'
    });
    
    await snapshot.save();
    res.status(201).json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get snapshots for a room
router.get('/:roomId', authMiddleware, async (req, res) => {
  try {
    const snapshots = await Snapshot.find({ roomId: req.params.roomId }).sort('-createdAt');
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
