import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase } from './server/db.ts';
import { apiRouter } from './server/api.ts';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Body parsing middleware with expanded limits for image uploads (logos, stamps, medicine photos)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Mount API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', engine: 'PostgreSQL 18.3 Relational Database', mode: process.env.NODE_ENV || 'development' });
  });

  app.use('/api/v1', apiRouter);

  // Global error handling middleware (handles payload limits, JSON syntax errors, etc.)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err?.type === 'entity.too.large' || err?.status === 413) {
      return res.status(413).json({
        error: 'Payload too large',
        message: 'The submitted file or payload is too large (max 50MB).',
      });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({
        error: 'Invalid JSON',
        message: 'The request payload contains malformed JSON.',
      });
    }
    console.error('[Server Error]', err);
    res.status(500).json({ error: 'Internal Server Error', message: err?.message || 'Unexpected server error' });
  });

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
    console.log(`[Server] Production mode active. Serving static files from: ${distPath}`);
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
