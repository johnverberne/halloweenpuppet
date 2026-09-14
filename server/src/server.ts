import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createSessionId, DEFAULT_SESSION_SETTINGS, normalizeSessionId } from '@halloweenpuppet/shared';
import { SessionManager } from './sessions/SessionManager.js';
import { attachTrackingGateway } from './sockets/trackingGateway.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 3000);
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

const app = express();
app.use(cors());
app.use(express.json());

const sessions = new SessionManager();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'halloweenpuppet', phases: [1, 2, 3] });
});

app.get('/api/connect-info', (_req, res) => {
  res.json({ lanAddresses: lanAddresses() });
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

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true },
  transports: ['websocket', 'polling'],
});

attachTrackingGateway(io, sessions);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[halloweenpuppet] server listening on http://localhost:${PORT}`);
});

function lanAddresses(): string[] {
  const addresses: string[] = [];
  for (const adapters of Object.values(os.networkInterfaces())) {
    for (const adapter of adapters ?? []) {
      if (adapter.family === 'IPv4' && !adapter.internal) {
        addresses.push(adapter.address);
      }
    }
  }
  return addresses;
}
