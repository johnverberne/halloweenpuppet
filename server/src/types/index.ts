import type { ClientRole, SessionClientInfo, SessionSettings } from '@halloweenpuppet/shared';

export interface SessionClient extends SessionClientInfo {
  sessionId: string;
}

export interface SessionRecord {
  sessionId: string;
  createdAt: number;
  clients: Map<string, SessionClient>;
  settings: SessionSettings;
}

export interface JoinAck {
  ok: boolean;
  sessionId: string;
  clientId: string;
  role: ClientRole;
  error?: string;
}
