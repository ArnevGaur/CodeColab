const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-123';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev-refresh-key-456';

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return res.status(400).json({ error: 'Missing fields' });
    
    // In a real app we'd send an email with nodemailer mock here
    const user = new User({ email, username, password, isVerified: true });
    await user.save();
    
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    
    const accessToken = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user._id }, REFRESH_SECRET, { expiresIn: '7d' });
    
    user.refreshToken = refreshToken;
    await user.save();
    
    res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ accessToken, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh
router.post('/refresh', async (req, res) => {
  try {
    const rfToken = req.cookies.refreshToken;
    if (!rfToken) return res.status(401).json({ error: 'No refresh token' });
    
    const decoded = jwt.verify(rfToken, REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== rfToken) return res.status(401).json({ error: 'Invalid token' });
    
    const accessToken = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

module.exports = router;
