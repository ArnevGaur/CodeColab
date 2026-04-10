const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const jwt = require('jsonwebtoken');
const ts = require('typescript');

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

// Local Execute Code with Stdin Support
router.post('/', authMiddleware, async (req, res) => {
  const { language, content, stdin } = req.body;
  
  if (!language || content === undefined || content === null) {
    return res.status(400).json({ error: 'Language and content required' });
  }

  // 1. Prepare temp directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codecolab-exec-'));

  // 2. Map language to extension and command
  const langConfig = {
    python: { ext: 'py', command: 'python3' },
    javascript: { ext: 'js', command: 'node' },
    typescript: { ext: 'ts', command: 'node' },
    cpp: { ext: 'cpp', command: 'g++' },
    go: { ext: 'go', command: 'go run' }
  };

  const config = langConfig[language.toLowerCase()];
  if (!config) {
    return res.status(400).json({ error: `Language ${language} not supported for local execution` });
  }

  const fileName = `exec_${Date.now()}.${config.ext}`;
  const filePath = path.join(tempDir, fileName);
  let compiledJsPath = null;

  try {
    // 3. Write code to file
    if (language.toLowerCase() === 'typescript') {
      const transpiled = ts.transpileModule(content, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          esModuleInterop: true
        }
      });
      compiledJsPath = filePath.replace(/\.ts$/, '.js');
      fs.writeFileSync(filePath, content);
      fs.writeFileSync(compiledJsPath, transpiled.outputText);
    } else {
      fs.writeFileSync(filePath, content);
    }

    // 4. Build execution command
    let fullCommand = `${config.command} ${filePath}`;
    if (language.toLowerCase() === 'typescript' && compiledJsPath) {
      fullCommand = `node ${compiledJsPath}`;
    }
    
    // Special handling for C++ (needs compile step)
    if (language.toLowerCase() === 'cpp') {
      const outPath = filePath.replace('.cpp', '.out');
      fullCommand = `g++ ${filePath} -o ${outPath} && ${outPath}`;
    }

    // 5. Execute with 10s timeout and Stdin
    const child = exec(fullCommand, { timeout: 10000 }, (error, stdout, stderr) => {
      // 6. Cleanup
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (compiledJsPath && fs.existsSync(compiledJsPath)) fs.unlinkSync(compiledJsPath);
        if (language.toLowerCase() === 'cpp') {
          const outPath = filePath.replace('.cpp', '.out');
          if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        }
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.error('[Cleanup Error]', cleanupErr);
      }

      if (error && (error.killed || error.signal === 'SIGTERM')) {
        return res.status(408).json({ error: 'Execution timeout (10s limit). Did you forget to provide program input?' });
      }

      if (error && error.code === 127) {
        return res.status(500).json({ error: 'Required runtime is not installed on the server', stderr });
      }

      res.json({
        stdout: stdout,
        stderr: stderr || (error ? error.message : ''),
        code: error ? (error.code || 1) : 0,
        signal: error ? error.signal : null
      });
    });

    // Write provided stdin to the process
    if (stdin) {
      // Ensure stdin ends with a newline so input() calls don't hit EOF
      const normalizedStdin = stdin.endsWith('\n') ? stdin : stdin + '\n';
      child.stdin.write(normalizedStdin);
    }
    child.stdin.end();

  } catch (err) {
    res.status(500).json({ error: `Internal execution error: ${err.message}` });
  }
});

module.exports = router;
