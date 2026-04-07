const express = require('express');
const router = express.Router();
const axios = require('axios');

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

const PISTON_LANGUAGE_VERSIONS = {
  javascript: '18.15.0',
  python: '3.10.0',
  cpp: '10.2.0',
  csharp: '6.12.0',
  java: '15.0.2',
  typescript: '5.0.3'
};

// Execute Code
router.post('/', authMiddleware, async (req, res) => {
  const { language, content } = req.body;
  if (!language || !content) return res.status(400).json({ error: 'Language and content required' });
  
  const version = PISTON_LANGUAGE_VERSIONS[language.toLowerCase()] || '*';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, 10000); // 10 second timeout

    const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
      language: language.toLowerCase() === 'cpp' ? 'c++' : language.toLowerCase(),
      version: version,
      files: [{ content }],
    }, {
      signal: controller.signal
    });

    clearTimeout(timeout);
    
    res.json({
      stdout: response.data.run.stdout,
      stderr: response.data.run.stderr,
      code: response.data.run.code,
      signal: response.data.run.signal,
      compile_output: response.data.compile ? response.data.compile.output : ''
    });

  } catch (err) {
    if (axios.isCancel(err)) {
       return res.status(408).json({ error: 'Execution timeout (10s limit)' });
    }
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

module.exports = router;
