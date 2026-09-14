import type {
  ConnectionState,
  JoinPayload,
  SessionSettings,
  SessionSnapshot,
  TrackingFrame,
} from '@halloweenpuppet/shared';

export type FrameHandler = (frame: TrackingFrame) => void;
export type ConnectionHandler = (state: ConnectionState) => void;
export type SessionHandler = (snapshot: SessionSnapshot) => void;
export type LatencyHandler = (rttMs: number) => void;
export type SettingsHandler = (settings: SessionSettings) => void;

export interface TrackingTransport {
  connect(payload: JoinPayload): Promise<string>;
  disconnect(): void;
  sendFrame(frame: TrackingFrame): void;
  sendSettings(settings: Partial<SessionSettings>): void;
  measureLatency(): void;
  onFrame(handler: FrameHandler): () => void;
  onConnectionState(handler: ConnectionHandler): () => void;
  onSession(handler: SessionHandler): () => void;
  onSettings(handler: SettingsHandler): () => void;
  onLatency(handler: LatencyHandler): () => void;
}
