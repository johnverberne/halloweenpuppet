<template>
  <section class="panel">
    <p class="kicker">Opname</p>
    <p class="muted">9:16 WebM · canvas + muziek</p>
    <div class="row">
      <button type="button" :disabled="state === 'recording'" @click="emit('start')">Start recording</button>
      <button type="button" class="danger" :disabled="state !== 'recording'" @click="emit('stop')">
        Stop recording
      </button>
      <button type="button" class="secondary" :disabled="state !== 'ready'" @click="emit('download')">
        Download
      </button>
    </div>
    <p class="muted status">{{ statusLabel }}</p>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RecorderState } from '../recording/StageRecorder';

const props = defineProps<{
  state: RecorderState;
  errorMessage?: string;
}>();

const emit = defineEmits<{
  start: [];
  stop: [];
  download: [];
}>();

const statusLabel = computed(() => {
  if (props.state === 'recording') {
    return 'Opname loopt…';
  }
  if (props.state === 'ready') {
    return 'Klaar om te downloaden';
  }
  return 'Nog geen opname';
});
</script>

<style scoped>
.muted {
  margin: 0 0 0.7rem;
}

.status {
  margin-top: 0.7rem;
}

.error {
  margin: 0.4rem 0 0;
  color: var(--danger);
  font-size: 0.85rem;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
