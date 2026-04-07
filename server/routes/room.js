const express = require('express');
const router = express.Router();
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

// Create Room
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, language, isPublic } = req.body;
    const roomId = Math.random().toString(36).substring(2, 10); // Simple random ID
    
    const room = new Room({
      roomId,
      name,
      language,
      isPublic,
      createdBy: req.user.userId,
      participants: [{ userId: req.user.userId, role: 'owner' }]
    });
    
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Room
router.get('/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId }).populate('participants.userId', 'username');
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's rooms
router.get('/user/me', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find({ 'participants.userId': req.user.userId }).sort('-updatedAt');
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change role
router.post('/:roomId/role', authMiddleware, async (req, res) => {
  try {
    const { targetUserId, newRole } = req.body;
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Not found' });
    
    const requester = room.participants.find(p => p.userId.toString() === req.user.userId);
    if (!requester || requester.role !== 'owner') return res.status(403).json({ error: 'Requires owner role' });
    
    const target = room.participants.find(p => p.userId.toString() === targetUserId);
    if (target) {
      target.role = newRole;
    } else {
      room.participants.push({ userId: targetUserId, role: newRole });
    }
    
    await room.save();
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
