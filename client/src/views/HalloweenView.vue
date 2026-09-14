<template>
  <main class="halloween" :class="{ narrow }">
    <div class="viewport">
      <canvas ref="sceneRef" class="scene"></canvas>
      <canvas ref="overlayRef" class="overlay"></canvas>
      <CountdownOverlay :label="countdownLabel" />
      <p class="banner">Halloween · {{ figureLabel }} · {{ exaggerationName }}</p>
      <button v-if="narrow" type="button" class="fab" @click="drawerOpen = !drawerOpen">
        {{ drawerOpen ? 'Sluit bediening' : 'Bediening' }}
      </button>
    </div>

    <aside v-show="!narrow || drawerOpen" class="sidebar">
      <DebugOverlay
        title="Halloween"
        :session-id="sessionId"
        :connection-state="connectionState"
        :tracking-mode="incomingMode"
        :tracking-fps="trackingFps"
        :render-fps="renderFps"
        :latency-ms="latencyMs"
        :frame-age-ms="frameAgeMs"
        :person-count="personCount"
        :pose-confidence="poseConfidence"
        :face-confidence="faceConfidence"
        :glasses-present="glassesPresent"
        :glasses-confidence="glassesConfidence"
        :sensor-count="sensorCount"
        :stage-count="stageCount"
        :exaggeration-label="exaggerationName"
        start-open
      />
      <FaceFigurePicker v-model="settings.halloweenFigure" />
      <ExaggerationPicker v-model="settings.exaggerationPreset" />
      <section class="panel">
        <p class="kicker">Weergave</p>
        <label class="check">
          <input v-model="settings.showDebugSkeleton" type="checkbox" />
          2D debug skeleton
        </label>
        <label class="field">
          Smoothing
          <input v-model.number="settings.smoothing" type="range" min="0.1" max="0.8" step="0.05" />
          <span>{{ settings.smoothing.toFixed(2) }} new</span>
        </label>
        <p class="muted">{{ avatarStatus }}</p>
      </section>
      <MusicControls
        :player="player"
        :counting="counting"
        v-model:record-on-start="recordOnStart"
        @countdown="startWithCountdown"
      />
      <RecordControls
        :state="recorderState"
        :error-message="recorderError"
        @start="startRecording"
        @stop="stopRecording"
        @download="downloadRecording"
      />
      <PhoneConnect :path="`/sensor/${sessionId}`" />
      <section class="panel">
        <p class="kicker">Sessie</p>
        <p class="muted">Sensors {{ sensorCount }} · Stages {{ stageCount }}</p>
        <RouterLink :to="`/sensor/${sessionId}`">Open sensor</RouterLink>
        <RouterLink :to="`/stage/${sessionId}`">Open stage</RouterLink>
        <RouterLink :to="`/dance/${sessionId}`">Open dance</RouterLink>
      </section>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { EXAGGERATION_PRESETS, HALLOWEEN_FIGURES } from '@halloweenpuppet/shared';
import CountdownOverlay from '../components/CountdownOverlay.vue';
import DebugOverlay from '../components/DebugOverlay.vue';
import ExaggerationPicker from '../components/ExaggerationPicker.vue';
import FaceFigurePicker from '../components/FaceFigurePicker.vue';
import MusicControls from '../components/MusicControls.vue';
import PhoneConnect from '../components/PhoneConnect.vue';
import RecordControls from '../components/RecordControls.vue';
import { useLiveStage } from '../composables/useLiveStage';
import { useNarrowViewport } from '../composables/useNarrowViewport';
import { useStageCapture } from '../composables/useStageCapture';
import { useSessionStore } from '../stores/session';
import { useSettingsStore } from '../stores/settings';

const sessionStore = useSessionStore();
const settings = useSettingsStore();
const narrow = useNarrowViewport();
const drawerOpen = ref(false);
const { sessionId, connectionState, latencyMs, sensorCount, stageCount } = storeToRefs(sessionStore);
const {
  sceneRef,
  overlayRef,
  trackingFps,
  renderFps,
  personCount,
  poseConfidence,
  faceConfidence,
  glassesPresent,
  glassesConfidence,
  incomingMode,
  avatarStatus,
  frameAgeMs,
  getCanvas,
} = useLiveStage('halloween');
const {
  player,
  countdownLabel,
  counting,
  recordOnStart,
  recorderState,
  recorderError,
  startWithCountdown,
  startRecording,
  stopRecording,
  downloadRecording,
} = useStageCapture(getCanvas);

const figureLabel = computed(
  () => HALLOWEEN_FIGURES.find((figure) => figure.id === settings.halloweenFigure)?.label ?? settings.halloweenFigure,
);
const exaggerationName = computed(
  () =>
    EXAGGERATION_PRESETS.find((preset) => preset.id === settings.exaggerationPreset)?.label ??
    settings.exaggerationPreset,
);
</script>

<style scoped>
.halloween {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1fr 22rem;
  background: #09070d;
}

.viewport {
  position: relative;
  min-height: 100dvh;
  background:
    radial-gradient(circle at 18% 12%, #3a2410, transparent 28%),
    #09070d;
}

.scene,
.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.overlay {
  pointer-events: none;
}

.banner {
  position: absolute;
  top: calc(0.8rem + env(safe-area-inset-top));
  left: 0.8rem;
  margin: 0;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  background: rgba(248, 255, 107, 0.9);
  color: #102016;
  font-weight: 700;
  font-size: 0.82rem;
}

.fab {
  position: absolute;
  right: calc(0.8rem + env(safe-area-inset-right));
  bottom: calc(0.8rem + env(safe-area-inset-bottom));
  min-height: 2.8rem;
}

.sidebar {
  display: grid;
  align-content: start;
  gap: 0.8rem;
  padding: 0.8rem;
  padding-bottom: calc(0.8rem + env(safe-area-inset-bottom));
}

.check {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0.35rem 0;
  color: var(--muted);
}

@media (max-width: 900px) {
  .halloween {
    grid-template-columns: 1fr;
  }

  .viewport {
    min-height: 58dvh;
  }

  .sidebar {
    position: sticky;
    bottom: 0;
    max-height: 42dvh;
    overflow: auto;
    background: #100d12;
    border-top: 1px solid var(--line);
  }
}
</style>
