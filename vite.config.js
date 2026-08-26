import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// Custom plugin to serve and handle bug records in a shared folder
const bugTrackerPlugin = () => {
  const bugsDir = path.resolve(process.cwd(), 'bugs');
  const bugsFilePath = path.resolve(bugsDir, 'bugs.json');

  const ensureFileExists = () => {
    if (!fs.existsSync(bugsDir)) {
      fs.mkdirSync(bugsDir, { recursive: true });
    }
    if (!fs.existsSync(bugsFilePath)) {
      fs.writeFileSync(bugsFilePath, JSON.stringify([], null, 2), 'utf-8');
    }
  };

  const handleRequest = (req, res) => {
    ensureFileExists();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'GET') {
      try {
        const data = fs.readFileSync(bugsFilePath, 'utf-8');
        res.statusCode = 200;
        res.end(data);
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to read bugs list' }));
      }
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          fs.writeFileSync(bugsFilePath, JSON.stringify(parsed, null, 2), 'utf-8');
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, data: parsed }));
        } catch (err) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
      });
    } else {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    }
  };

  return {
    name: 'bug-tracker-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url;
        if (url && (url.startsWith('/rackplannerPRO/api/bugs') || url.startsWith('/api/bugs'))) {
          handleRequest(req, res);
        } else {
          next();
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url;
        if (url && (url.startsWith('/rackplannerPRO/api/bugs') || url.startsWith('/api/bugs'))) {
          handleRequest(req, res);
        } else {
          next();
        }
      });
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), bugTrackerPlugin()],
  base: '/rackplannerPRO/',
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        preview: path.resolve(__dirname, 'preview.html'),
      }
    }
  }
})

