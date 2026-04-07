import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { componentTagger } from "lovable-tagger";

const codeExecutionBackend = () => ({
  name: 'code-execution-backend',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url === '/api/execute' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', () => {
          try {
            const { fileName, content } = JSON.parse(body);
            // Secure temp dir in project root
            const tempDir = path.join(process.cwd(), '.temp_code');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
            
            const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const tempFile = path.join(tempDir, safeName);
            fs.writeFileSync(tempFile, content);
            
            // Map command based on extension
            let cmd = '';
            if (safeName.endsWith('.js') || safeName.endsWith('.ts')) {
               // We use npx tsx for ts just in case, but node for js
               cmd = safeName.endsWith('.ts') ? `npx tsx ${tempFile}` : `node ${tempFile}`;
            } else if (safeName.endsWith('.py')) {
               cmd = `python3 ${tempFile}`;
            } else if (safeName.endsWith('.go')) {
               cmd = `go run ${tempFile}`;
            }
            
            if (!cmd) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: `Execution not supported for .${safeName.split('.').pop()}` }));
              return;
            }

            exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
              if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                output: stdout, 
                error: stderr || (error ? error.message : null)
              }));
            });
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }
      next();
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), codeExecutionBackend(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
