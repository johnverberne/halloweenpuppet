import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ConnectionState, SessionSnapshot } from '@halloweenpuppet/shared';
import { normalizeSessionId } from '@halloweenpuppet/shared';

export const useSessionStore = defineStore('session', () => {
  const sessionId = ref(normalizeSessionId('DEMO'));
  const clientId = ref('');
  const clientName = ref('');
  const connectionState = ref<ConnectionState>('disconnected');
  const snapshot = ref<SessionSnapshot | null>(null);
  const latencyMs = ref<number | null>(null);

  const sensorCount = computed(
    () => snapshot.value?.clients.filter((client) => client.role === 'sensor').length ?? 0,
  );
  const stageCount = computed(
    () => snapshot.value?.clients.filter((client) => client.role === 'stage').length ?? 0,
  );

  function setSessionId(value: string): void {
    sessionId.value = normalizeSessionId(value);
  }

  return {
    sessionId,
    clientId,
    clientName,
    connectionState,
    snapshot,
    latencyMs,
    sensorCount,
    stageCount,
    setSessionId,
  };
});
