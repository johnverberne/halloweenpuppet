<template>
  <main class="stage">
    <div class="viewport">
      <canvas ref="sceneRef" class="scene"></canvas>
      <canvas ref="overlayRef" class="overlay"></canvas>
      <CountdownOverlay :label="countdownLabel" />
    </div>

    <aside class="sidebar">
      <DebugOverlay
        title="Stage"
        :session-id="sessionId"
        :connection-state="connectionState"
        :tracking-mode="incomingMode"
        :tracking-fps="trackingFps"
        :render-fps="renderFps"
        :latency-ms="latencyMs"
        :person-count="personCount"
        :pose-confidence="poseConfidence"
        :face-confidence="faceConfidence"
        :glasses-present="glassesPresent"
        :glasses-confidence="glassesConfidence"
      />

      <section class="panel">
        <p class="kicker">Weergave</p>
        <label class="check">
          <input v-model="settings.showDebugSkeleton" type="checkbox" />
          2D debug skeleton
        </label>
        <label class="check">
          <input v-model="settings.showHumanoid" type="checkbox" />
          3D humanoid
        </label>
        <label class="check">
          <input v-model="settings.showVrm" type="checkbox" />
          VRM avatar
        </label>
        <label class="field">
          Smoothing
          <input v-model.number="settings.smoothing" type="range" min="0.1" max="0.8" step="0.05" />
          <span>{{ settings.smoothing.toFixed(2) }} new / {{ (1 - settings.smoothing).toFixed(2) }} previous</span>
        </label>
        <p class="muted">{{ avatarStatus }}</p>
      </section>

      <FaceFigurePicker v-model="settings.halloweenFigure" />
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

      <section class="panel">
        <p class="kicker">Sessie</p>
        <p class="muted">Sensors {{ sensorCount }} · Stages {{ stageCount }}</p>
        <RouterLink :to="`/music/${sessionId}`">Open muziekmodus</RouterLink>
        <RouterLink :to="`/sensor/${sessionId}`">Open sensor van deze sessie</RouterLink>
      </section>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import CountdownOverlay from '../components/CountdownOverlay.vue';
import DebugOverlay from '../components/DebugOverlay.vue';
import FaceFigurePicker from '../components/FaceFigurePicker.vue';
import MusicControls from '../components/MusicControls.vue';
import RecordControls from '../components/RecordControls.vue';
import { useLiveStage } from '../composables/useLiveStage';
import { useStageCapture } from '../composables/useStageCapture';
import { useSessionStore } from '../stores/session';
import { useSettingsStore } from '../stores/settings';

const sessionStore = useSessionStore();
const settings = useSettingsStore();
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
  attachMusicPlayer,
  getCanvas,
} = useLiveStage('stage');
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
attachMusicPlayer(player);
</script>

<style scoped>
.stage {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 22rem;
}

.viewport {
  position: relative;
  min-height: 100vh;
  background: #141018;
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

.sidebar {
  display: grid;
  align-content: start;
  gap: 0.8rem;
  padding: 0.8rem;
}

.check {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0.35rem 0;
  color: var(--muted);
}

@media (max-width: 900px) {
  .stage {
    grid-template-columns: 1fr;
  }

  .viewport {
    min-height: 55vh;
  }
}
</style>
