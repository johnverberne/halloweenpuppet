import type { Server, Socket } from 'socket.io';
import {
  SOCKET_EVENTS,
  type JoinPayload,
  type LatencyPing,
  type SessionSettings,
  type TrackingFrame,
} from '@halloweenpuppet/shared';
import type { SessionManager } from '../sessions/SessionManager.js';
import type { JoinAck } from '../types/index.js';

export function attachTrackingGateway(io: Server, sessions: SessionManager): void {
  io.on('connection', (socket: Socket) => {
    socket.on(SOCKET_EVENTS.join, (payload: JoinPayload, ack?: (response: JoinAck) => void) => {
      const role = payload.role === 'stage' ? 'stage' : 'sensor';
      const client = sessions.addClient(payload.sessionId, socket.id, role, payload.name ?? '');
      void socket.join(client.sessionId);
      const response: JoinAck = {
        ok: true,
        sessionId: client.sessionId,
        clientId: socket.id,
        role: client.role,
      };
      emitSessionState(io, sessions, client.sessionId);
      ack?.(response);
    });

    socket.on(SOCKET_EVENTS.trackingFrame, (frame: TrackingFrame) => {
      const client = sessions.getClient(socket.id);
      if (!client || client.role !== 'sensor') {
        return;
      }
      const outbound: TrackingFrame = {
        ...frame,
        type: 'tracking-frame',
        clientId: client.socketId,
      };
      socket.to(client.sessionId).emit(SOCKET_EVENTS.trackingFrame, outbound);
    });

    socket.on(SOCKET_EVENTS.sessionSettings, (patch: Partial<SessionSettings>) => {
      const client = sessions.getClient(socket.id);
      if (!client) {
        return;
      }
      const settings = sessions.updateSettings(client.sessionId, patch);
      if (settings) {
        io.to(client.sessionId).emit(SOCKET_EVENTS.sessionSettings, settings);
        emitSessionState(io, sessions, client.sessionId);
      }
    });

    socket.on(SOCKET_EVENTS.ping, (payload: LatencyPing) => {
      socket.emit(SOCKET_EVENTS.pong, {
        clientTime: payload.clientTime,
        serverTime: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      const removed = sessions.removeClient(socket.id);
      if (removed) {
        emitSessionState(io, sessions, removed.sessionId);
      }
    });
  });
}

function emitSessionState(io: Server, sessions: SessionManager, sessionId: string): void {
  const snapshot = sessions.snapshot(sessionId);
  if (!snapshot) {
    return;
  }
  io.to(sessionId).emit(SOCKET_EVENTS.sessionState, snapshot);
}
