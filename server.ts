import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get('/health-check', (req, res) => res.send('OK - GymFlow Server is alive'));

  const isProd = process.env.NODE_ENV === 'production';
  console.log(`Mode: ${isProd ? 'production' : 'development'}`);

  if (!isProd) {
    console.log('Setting up Vite middleware (SPA mode)...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Setting up static file serving for production...');
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.error('ERROR: dist directory not found! Did you run npm run build?');
      app.get('*', (req, res) => res.status(500).send('Production build missing'));
    }
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GymFlow server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('CRITICAL: Server failed to start:', err);
});
