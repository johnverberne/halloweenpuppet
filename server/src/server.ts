import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { createSessionId, DEFAULT_SESSION_SETTINGS, normalizeSessionId } from '@halloweenpuppet/shared';
import { createDevCertificates } from './httpsCert.js';
import { lanAddresses } from './lan.js';
import { SessionManager } from './sessions/SessionManager.js';
import { attachTrackingGateway } from './sockets/trackingGateway.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 3000);
const CLIENT_ROOT = path.resolve(__dirname, '../../client');
const CLIENT_DIST = path.resolve(CLIENT_ROOT, 'dist');
const CLIENT_CONFIG = path.resolve(CLIENT_ROOT, 'vite.config.ts');
const USE_HTTPS = process.env.HP_HTTPS !== '0';
const API_ONLY = process.argv.includes('--api-only');
const USE_STATIC = process.argv.includes('--static') || process.env.NODE_ENV === 'production';
const USE_VITE = !API_ONLY && !USE_STATIC;

async function start(): Promise<void> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const sessions = new SessionManager();
  const ips = lanAddresses();
  const protocol = USE_HTTPS ? 'https' : 'http';

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'halloweenpuppet', protocol, port: PORT, vite: USE_VITE });
  });

  app.get('/api/connect-info', (_req, res) => {
    res.json({ lanAddresses: ips, port: PORT, protocol });
  });

  app.post('/api/sessions', (_req, res) => {
    const sessionId = createSessionId();
    sessions.getOrCreate(sessionId);
    res.status(201).json({ sessionId });
  });

  app.get('/api/sessions/:id', (req, res) => {
    const sessionId = normalizeSessionId(req.params.id);
    const snapshot = sessions.snapshot(sessionId) ?? {
      sessionId,
      clients: [],
      settings: { ...DEFAULT_SESSION_SETTINGS },
    };
    res.json(snapshot);
  });

  app.get('/api/sessions', (_req, res) => {
    res.json({ sessions: sessions.list() });
  });

  const httpServer = USE_HTTPS
    ? createHttpsServer(createDevCertificates(ips), app)
    : createHttpServer(app);

  if (USE_VITE) {
    process.env.HP_UNIFIED = '1';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: CLIENT_ROOT,
      configFile: CLIENT_CONFIG,
      appType: 'custom',
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: { server: httpServer },
      },
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        next();
        return;
      }
      try {
        const template = fs.readFileSync(path.join(CLIENT_ROOT, 'index.html'), 'utf8');
        const html = await vite.transformIndexHtml(req.originalUrl ?? '/', template);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(html);
      } catch (error) {
        next(error);
      }
    });
  } else if (!API_ONLY) {
    if (!fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
      console.error('[halloweenpuppet] client/dist ontbreekt. Run eerst `npm run build`.');
      process.exit(1);
    }
    app.use(express.static(CLIENT_DIST));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        next();
        return;
      }
      res.sendFile(path.join(CLIENT_DIST, 'index.html'), (error) => {
        if (error) {
          next();
        }
      });
    });
  }

  const io = new Server(httpServer, {
    cors: { origin: true },
    transports: ['websocket', 'polling'],
  });
  attachTrackingGateway(io, sessions);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[halloweenpuppet] ${protocol}://localhost:${PORT}`);
    for (const ip of ips) {
      console.log(`[halloweenpuppet] ${protocol}://${ip}:${PORT}`);
    }
    if (USE_VITE) {
      console.log('[halloweenpuppet] Vue + API + Socket.IO in één proces (Vite middleware)');
    } else if (API_ONLY) {
      console.log('[halloweenpuppet] Alleen API + Socket.IO (Vue via Vite op 5173)');
    } else {
      console.log('[halloweenpuppet] Vue + API + Socket.IO in één proces (client/dist)');
    }
  });
}

void start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
