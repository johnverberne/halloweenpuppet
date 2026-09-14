const PREFIX = 'HALLOWEEN';

export function createSessionId(): string {
  const token = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${PREFIX}-${token}`;
}

export function normalizeSessionId(raw: string | undefined | null): string {
  const trimmed = (raw ?? '').trim().toUpperCase();
  if (!trimmed) {
    return createSessionId();
  }
  if (trimmed.startsWith(`${PREFIX}-`)) {
    return trimmed;
  }
  return `${PREFIX}-${trimmed.replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'DEMO'}`;
}
