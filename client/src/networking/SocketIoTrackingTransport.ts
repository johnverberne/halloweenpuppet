import { io, type Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  type ConnectionState,
  type JoinPayload,
  type LatencyPong,
  type SessionSettings,
  type SessionSnapshot,
  type TrackingFrame,
} from '@halloweenpuppet/shared';
import type {
  ConnectionHandler,
  FrameHandler,
  LatencyHandler,
  SessionHandler,
  SettingsHandler,
  TrackingTransport,
} from './TrackingTransport';

export class SocketIoTrackingTransport implements TrackingTransport {
  private socket: Socket | null = null;
  private readonly frameHandlers = new Set<FrameHandler>();
  private readonly connectionHandlers = new Set<ConnectionHandler>();
  private readonly sessionHandlers = new Set<SessionHandler>();
  private readonly latencyHandlers = new Set<LatencyHandler>();
  private readonly settingsHandlers = new Set<SettingsHandler>();

  async connect(payload: JoinPayload): Promise<string> {
    this.disconnect();
    this.setState('connecting');

    const socket = io({
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      timeout: 12000,
    });
    this.socket = socket;

    socket.on('connect_error', () => {
      this.setState('error');
    });

    socket.on('disconnect', () => {
      this.setState('disconnected');
    });

    socket.on(SOCKET_EVENTS.trackingFrame, (frame: TrackingFrame) => {
      for (const handler of this.frameHandlers) {
        handler(frame);
      }
    });

    socket.on(SOCKET_EVENTS.sessionState, (snapshot: SessionSnapshot) => {
      for (const handler of this.sessionHandlers) {
        handler(snapshot);
      }
    });

    socket.on(SOCKET_EVENTS.sessionSettings, (settings: SessionSettings) => {
      for (const handler of this.settingsHandlers) {
        handler(settings);
      }
    });

    socket.on(SOCKET_EVENTS.pong, (pong: LatencyPong) => {
      const rttMs = Math.max(0, Date.now() - pong.clientTime);
      for (const handler of this.latencyHandlers) {
        handler(rttMs);
      }
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error('Socket.IO connection timed out'));
      }, 8000);
      socket.once('connect', () => {
        window.clearTimeout(timeout);
        resolve();
      });
      socket.once('connect_error', (error: Error) => {
        window.clearTimeout(timeout);
        reject(error);
      });
    });

    const clientId = await new Promise<string>((resolve, reject) => {
      socket.emit(SOCKET_EVENTS.join, payload, (ack: { ok: boolean; clientId: string; error?: string }) => {
        if (!ack?.ok) {
          reject(new Error(ack?.error ?? 'Join failed'));
          return;
        }
        resolve(ack.clientId);
      });
    });

    this.setState('connected');
    return clientId;
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.setState('disconnected');
  }

  sendFrame(frame: TrackingFrame): void {
    this.socket?.emit(SOCKET_EVENTS.trackingFrame, frame);
  }

  sendSettings(settings: Partial<SessionSettings>): void {
    this.socket?.emit(SOCKET_EVENTS.sessionSettings, settings);
  }

  measureLatency(): void {
    this.socket?.emit(SOCKET_EVENTS.ping, { clientTime: Date.now() });
  }

  onFrame(handler: FrameHandler): () => void {
    this.frameHandlers.add(handler);
    return () => this.frameHandlers.delete(handler);
  }

  onConnectionState(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onSession(handler: SessionHandler): () => void {
    this.sessionHandlers.add(handler);
    return () => this.sessionHandlers.delete(handler);
  }

  onLatency(handler: LatencyHandler): () => void {
    this.latencyHandlers.add(handler);
    return () => this.latencyHandlers.delete(handler);
  }

  onSettings(handler: SettingsHandler): () => void {
    this.settingsHandlers.add(handler);
    return () => this.settingsHandlers.delete(handler);
  }

  private setState(state: ConnectionState): void {
    for (const handler of this.connectionHandlers) {
      handler(state);
    }
  }
}
