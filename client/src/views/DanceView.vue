<template>
  <main class="dance">
    <div class="phone">
      <div class="viewport">
        <canvas ref="sceneRef" class="scene"></canvas>
        <canvas ref="overlayRef" class="overlay"></canvas>
        <CountdownOverlay :label="countdownLabel" />
        <p v-if="isPlaying" class="now-playing">{{ trackTitle }}</p>
        <p class="cast-banner">{{ settings.danceCast === 'duo' ? 'Duo' : 'Solo' }} · {{ personCount }} persoon{{ personCount === 1 ? '' : 'en' }}</p>
      </div>
    </div>

    <aside class="sidebar">
      <DebugOverlay
        title="Dance"
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
        :exaggeration-label="exaggerationName"
      />

      <section class="panel">
        <p class="kicker">Cast</p>
        <label class="field">
          Personen
          <select v-model="settings.danceCast">
            <option value="solo">Solo — 1 avatar</option>
            <option value="duo">Duo — 2 avatars</option>
          </select>
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
      <FaceFigurePicker v-model="settings.halloweenFigure" title="Figuur A" />
      <FaceFigurePicker v-if="settings.danceCast === 'duo'" v-model="settings.halloweenFigureB" title="Figuur B" />
      <ExaggerationPicker v-model="settings.exaggerationPreset" />
      <section class="panel">
        <p class="kicker">Sessie</p>
        <RouterLink :to="`/halloween/${sessionId}`">Open halloween</RouterLink>
        <RouterLink :to="`/stage/${sessionId}`">Open brede stage</RouterLink>
        <RouterLink :to="`/music/${sessionId}`">Open muziek</RouterLink>
        <RouterLink :to="`/sensor/${sessionId}`">Open sensor</RouterLink>
      </section>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { exaggerationLabel } from '../animation/MotionExaggeration';
import CountdownOverlay from '../components/CountdownOverlay.vue';
import DebugOverlay from '../components/DebugOverlay.vue';
import ExaggerationPicker from '../components/ExaggerationPicker.vue';
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
  avatarStatus,
  frameAgeMs,
  getCanvas,
} = useLiveStage('dance');
const exaggerationName = computed(() => exaggerationLabel(settings.exaggerationPreset));
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
</script>

<style scoped>
.dance {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1fr 22rem;
  background:
    radial-gradient(circle at 80% 0%, #2d2238, transparent 40%),
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
  width: min(100%, calc(100dvh - 2rem) * 9 / 16);
  max-height: calc(100dvh - 2rem);
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

.now-playing,
.cast-banner {
  position: absolute;
  left: 0.8rem;
  right: 0.8rem;
  margin: 0;
  padding: 0.45rem 0.65rem;
  border-radius: 10px;
  background: rgba(10, 8, 12, 0.65);
  font-size: 0.82rem;
}

.now-playing {
  bottom: 0.8rem;
}

.cast-banner {
  top: 0.8rem;
}

.sidebar {
  display: grid;
  align-content: start;
  gap: 0.8rem;
  padding: 0.8rem;
}

.field {
  margin-top: 0.4rem;
}

@media (max-width: 900px) {
  .dance {
    grid-template-columns: 1fr;
  }

  .sidebar {
    padding-bottom: calc(0.8rem + env(safe-area-inset-bottom));
  }
}
</style>
