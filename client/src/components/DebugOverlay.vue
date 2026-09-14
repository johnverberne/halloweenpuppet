<template>
  <section class="panel debug-overlay">
    <header class="head">
      <div>
        <strong>{{ title }}</strong>
        <p class="kicker session">{{ sessionId }}</p>
      </div>
      <button type="button" class="secondary toggle" @click="open = !open">
        {{ open ? 'Minder' : 'Meer' }}
      </button>
    </header>

    <dl class="metrics">
      <div>
        <dt>Verbinding</dt>
        <dd>
          <em :class="['badge', connectionState === 'connected' ? 'ok' : 'warn']">{{ connectionState }}</em>
        </dd>
      </div>
      <div>
        <dt>RTT</dt>
        <dd :class="latencyClass">{{ latencyLabel }}</dd>
      </div>
      <div>
        <dt>Frame</dt>
        <dd :class="frameClass">{{ frameLabel }}</dd>
      </div>
      <div>
        <dt>Track</dt>
        <dd>{{ trackingFps.toFixed(1) }} fps</dd>
      </div>
      <div>
        <dt>Render</dt>
        <dd>{{ renderFps.toFixed(1) }} fps</dd>
      </div>
      <div>
        <dt>Personen</dt>
        <dd>{{ personCount }}</dd>
      </div>
    </dl>

    <dl v-if="open" class="metrics extra">
      <div>
        <dt>Modus</dt>
        <dd>{{ modeLabel }}</dd>
      </div>
      <div>
        <dt>{{ confidenceLabel }}</dt>
        <dd>{{ confidence.toFixed(2) }}</dd>
      </div>
      <div v-if="trackingMode === 'face'">
        <dt>Bril</dt>
        <dd>{{ glassesLabel }}</dd>
      </div>
      <div v-if="sensorCount !== undefined">
        <dt>Sensors</dt>
        <dd>{{ sensorCount }}</dd>
      </div>
      <div v-if="stageCount !== undefined">
        <dt>Stages</dt>
        <dd>{{ stageCount }}</dd>
      </div>
      <div v-if="exaggerationLabel">
        <dt>Overdrijving</dt>
        <dd>{{ exaggerationLabel }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
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
    frameAgeMs?: number | null;
    personCount: number;
    poseConfidence?: number;
    faceConfidence?: number;
    glassesPresent?: boolean;
    glassesConfidence?: number;
    sensorCount?: number;
    stageCount?: number;
    exaggerationLabel?: string;
    startOpen?: boolean;
  }>(),
  {
    trackingMode: 'body',
    frameAgeMs: null,
    poseConfidence: 0,
    faceConfidence: 0,
    glassesPresent: false,
    glassesConfidence: 0,
    startOpen: false,
  },
);

const open = ref(props.startOpen);
const modeLabel = computed(() => (props.trackingMode === 'face' ? 'Gezicht' : 'Hele lichaam'));
const confidenceLabel = computed(() => (props.trackingMode === 'face' ? 'Face' : 'Pose'));
const confidence = computed(() =>
  props.trackingMode === 'face' ? props.faceConfidence : props.poseConfidence,
);
const latencyLabel = computed(() =>
  props.latencyMs === null ? '—' : `${Math.round(props.latencyMs)} ms`,
);
const frameLabel = computed(() =>
  props.frameAgeMs === null ? '—' : `${Math.round(props.frameAgeMs)} ms`,
);
const latencyClass = computed(() => tone(props.latencyMs, 80, 160));
const frameClass = computed(() => tone(props.frameAgeMs, 80, 180));
const glassesLabel = computed(() =>
  props.glassesPresent ? `aan (${props.glassesConfidence.toFixed(2)})` : 'uit',
);

function tone(value: number | null | undefined, good: number, warn: number): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value <= good) {
    return 'ok';
  }
  if (value <= warn) {
    return 'warn';
  }
  return 'bad';
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.6rem;
}

.session {
  margin: 0.15rem 0 0;
}

.toggle {
  min-height: 2.2rem;
  padding: 0.35rem 0.7rem;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem 0.7rem;
  margin: 0.7rem 0 0;
}

.metrics.extra {
  margin-top: 0.55rem;
  padding-top: 0.55rem;
  border-top: 1px solid var(--line);
}

.metrics div {
  display: grid;
  gap: 0.1rem;
}

dt {
  color: var(--muted);
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

dd.ok {
  color: var(--accent);
}

dd.warn {
  color: #ffd27a;
}

dd.bad {
  color: var(--danger);
}

@media (max-width: 900px) {
  .metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
