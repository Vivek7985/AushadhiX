import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase } from './server/db.ts';
import { apiRouter } from './server/api.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsing middleware
  app.use(express.json());

  // Mount API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', engine: 'PostgreSQL 18.3 Relational Database', mode: process.env.NODE_ENV || 'development' });
  });

  app.use('/api/v1', apiRouter);

  // Initialize PostgreSQL database schemas, constraints, and seeds
  try {
    await initializeDatabase();
    console.log('[Server] PostgreSQL database initialized successfully.');
  } catch (dbErr) {
    console.error('[Server] Failed to initialize database:', dbErr);
  }

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Pharmacy Management System running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
