<template>
  <div class="panel debug-overlay">
    <strong>{{ title }}</strong>
    <span>Session {{ sessionId }}</span>
    <span>
      Verbinding
      <em :class="['badge', connectionState === 'connected' ? 'ok' : 'warn']">{{ connectionState }}</em>
    </span>
    <span>Modus {{ modeLabel }}</span>
    <span>Tracking FPS {{ trackingFps.toFixed(1) }}</span>
    <span>Render FPS {{ renderFps.toFixed(1) }}</span>
    <span>Latency {{ latencyLabel }}</span>
    <span>Persons {{ personCount }}</span>
    <span>{{ confidenceLabel }} {{ confidence.toFixed(2) }}</span>
    <span v-if="trackingMode === 'face'">Bril {{ glassesLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ConnectionState, TrackingMode } from '@halloweenpuppet/shared';

const props = withDefaults(
  defineProps<{
    title: string;
    sessionId: string;
    connectionState: ConnectionState;
    trackingMode?: TrackingMode;
    trackingFps: number;
    renderFps: number;
    latencyMs: number | null;
    personCount: number;
    poseConfidence?: number;
    faceConfidence?: number;
    glassesPresent?: boolean;
    glassesConfidence?: number;
  }>(),
  {
    trackingMode: 'body',
    poseConfidence: 0,
    faceConfidence: 0,
    glassesPresent: false,
    glassesConfidence: 0,
  },
);

const modeLabel = computed(() => (props.trackingMode === 'face' ? 'Gezicht' : 'Hele lichaam'));
const confidenceLabel = computed(() => (props.trackingMode === 'face' ? 'Face' : 'Pose'));
const confidence = computed(() =>
  props.trackingMode === 'face' ? props.faceConfidence : props.poseConfidence,
);
const latencyLabel = computed(() =>
  props.latencyMs === null ? '—' : `${Math.round(props.latencyMs)} ms`,
);
const glassesLabel = computed(() =>
  props.glassesPresent ? `aan (${props.glassesConfidence.toFixed(2)})` : 'uit',
);
</script>
