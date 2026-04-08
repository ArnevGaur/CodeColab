const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
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

// Local Execute Code
router.post('/', authMiddleware, async (req, res) => {
  const { language, content } = req.body;
  
  if (!language || !content) {
    return res.status(400).json({ error: 'Language and content required' });
  }

  // 1. Prepare temp directory
  const tempDir = path.join(process.cwd(), '.temp_code');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // 2. Map language to extension and command
  const langConfig = {
    python: { ext: 'py', command: 'python3' },
    javascript: { ext: 'js', command: 'node' },
    typescript: { ext: 'ts', command: 'npx tsx' },
    cpp: { ext: 'cpp', command: 'g++' },
    go: { ext: 'go', command: 'go run' }
  };

  const config = langConfig[language.toLowerCase()];
  if (!config) {
    return res.status(400).json({ error: `Language ${language} not supported for local execution` });
  }

  const fileName = `exec_${Date.now()}.${config.ext}`;
  const filePath = path.join(tempDir, fileName);

  try {
    // 3. Write code to file
    fs.writeFileSync(filePath, content);

    // 4. Build execution command
    let fullCommand = `${config.command} ${filePath}`;
    
    // Special handling for C++ (needs compile step)
    if (language.toLowerCase() === 'cpp') {
      const outPath = filePath.replace('.cpp', '.out');
      fullCommand = `g++ ${filePath} -o ${outPath} && ${outPath}`;
    }

    // 5. Execute with 10s timeout
    exec(fullCommand, { timeout: 10000 }, (error, stdout, stderr) => {
      // 6. Cleanup
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (language.toLowerCase() === 'cpp') {
          const outPath = filePath.replace('.cpp', '.out');
          if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        }
      } catch (cleanupErr) {
        console.error('[Cleanup Error]', cleanupErr);
      }

      if (error && error.killed) {
        return res.status(408).json({ error: 'Execution timeout (10s limit)' });
      }

      res.json({
        stdout: stdout,
        stderr: stderr || (error ? error.message : ''),
        code: error ? (error.code || 1) : 0,
        signal: error ? error.signal : null
      });
    });

  } catch (err) {
    res.status(500).json({ error: `Internal execution error: ${err.message}` });
  }
});

module.exports = router;
