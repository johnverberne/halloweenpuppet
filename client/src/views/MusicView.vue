<template>
  <main class="music">
    <div class="phone">
      <div class="viewport">
        <canvas ref="sceneRef" class="scene"></canvas>
        <canvas ref="overlayRef" class="overlay"></canvas>
        <CountdownOverlay :label="countdownLabel" />
        <p v-if="isPlaying" class="now-playing">{{ trackTitle }}</p>
      </div>
    </div>

    <aside class="sidebar">
      <DebugOverlay
        title="Music"
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
      <FaceFigurePicker v-model="settings.halloweenFigure" />
      <section class="panel">
        <p class="kicker">Sessie</p>
        <p class="muted">Viseme {{ lipSyncViseme }} · mond {{ lipSyncMouth.toFixed(2) }}</p>
        <RouterLink :to="`/stage/${sessionId}`">Open brede stage</RouterLink>
        <RouterLink :to="`/sensor/${sessionId}`">Open sensor</RouterLink>
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
const { sessionId, connectionState, latencyMs } = storeToRefs(sessionStore);
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
  lipSyncMouth,
  lipSyncViseme,
  attachMusicPlayer,
  getCanvas,
} = useLiveStage('music');
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
  isPlaying,
  trackTitle,
} = useStageCapture(getCanvas);
attachMusicPlayer(player);
</script>

<style scoped>
.music {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 22rem;
  background:
    radial-gradient(circle at 20% 0%, #2d2238, transparent 40%),
    #100d12;
}

.phone {
  display: grid;
  place-items: center;
  padding: 1rem;
}

.viewport {
  position: relative;
  aspect-ratio: 9 / 16;
  width: min(100%, calc(100vh - 2rem) * 9 / 16);
  max-height: calc(100vh - 2rem);
  background: #09070d;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
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

.now-playing {
  position: absolute;
  left: 0.8rem;
  right: 0.8rem;
  bottom: 0.8rem;
  margin: 0;
  padding: 0.45rem 0.65rem;
  border-radius: 10px;
  background: rgba(10, 8, 12, 0.65);
  font-size: 0.82rem;
}

.sidebar {
  display: grid;
  align-content: start;
  gap: 0.8rem;
  padding: 0.8rem;
}

@media (max-width: 900px) {
  .music {
    grid-template-columns: 1fr;
  }
}
</style>
