import type { ClientRole, SessionSettings, SessionSnapshot } from '@halloweenpuppet/shared';
import { DEFAULT_SESSION_SETTINGS, normalizeSessionId } from '@halloweenpuppet/shared';
import type { SessionClient, SessionRecord } from '../types/index.js';

export class SessionManager {
  private readonly sessions = new Map<string, SessionRecord>();

  getOrCreate(rawSessionId: string): SessionRecord {
    const sessionId = normalizeSessionId(rawSessionId);
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing;
    }
    const created: SessionRecord = {
      sessionId,
      createdAt: Date.now(),
      clients: new Map(),
      settings: { ...DEFAULT_SESSION_SETTINGS },
    };
    this.sessions.set(sessionId, created);
    return created;
  }

  addClient(
    rawSessionId: string,
    socketId: string,
    role: ClientRole,
    name: string,
  ): SessionClient {
    const session = this.getOrCreate(rawSessionId);
    const client: SessionClient = {
      socketId,
      sessionId: session.sessionId,
      role,
      name: name || (role === 'sensor' ? 'Sensor' : 'Stage'),
      joinedAt: Date.now(),
    };
    session.clients.set(socketId, client);
    return client;
  }

  updateSettings(sessionId: string, patch: Partial<SessionSettings>): SessionSettings | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }
    session.settings = { ...session.settings, ...patch };
    return session.settings;
  }

  removeClient(socketId: string): SessionClient | undefined {
    for (const session of this.sessions.values()) {
      const client = session.clients.get(socketId);
      if (!client) {
        continue;
      }
      session.clients.delete(socketId);
      if (session.clients.size === 0) {
        this.sessions.delete(session.sessionId);
      }
      return client;
    }
    return undefined;
  }

  getClient(socketId: string): SessionClient | undefined {
    for (const session of this.sessions.values()) {
      const client = session.clients.get(socketId);
      if (client) {
        return client;
      }
    }
    return undefined;
  }

  snapshot(sessionId: string): SessionSnapshot | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }
    return toSnapshot(session);
  }

  list(): SessionSnapshot[] {
    return [...this.sessions.values()].map(toSnapshot);
  }
}

function toSnapshot(session: SessionRecord): SessionSnapshot {
  return {
    sessionId: session.sessionId,
    settings: session.settings,
    clients: [...session.clients.values()].map((client) => ({
      socketId: client.socketId,
      role: client.role,
      name: client.name,
      joinedAt: client.joinedAt,
    })),
  };
}
