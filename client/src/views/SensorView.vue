<template>
  <main class="sensor">
    <div class="viewport">
      <video ref="videoRef" playsinline muted autoplay></video>
      <canvas ref="overlayRef"></canvas>
      <div class="loop-hud">
        <p v-if="activeLoop" class="loop-banner">{{ activeLoop.label }} speelt in loop</p>
        <div class="loop-strip">
          <button
            v-for="animation in loopAnimations"
            :key="animation.id"
            type="button"
            :class="{ active: settings.loopAnimation === animation.id }"
            @click="toggleLoop(animation.id)"
          >
            {{ animation.label }}
          </button>
        </div>
      </div>
      <p class="privacy">Camera processing happens on this device. Video is not uploaded.</p>
    </div>

    <aside class="sidebar">
      <DebugOverlay
        title="Sensor"
        :session-id="sessionId"
        :connection-state="connectionState"
        :tracking-mode="settings.trackingMode"
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
        <p class="kicker">Camera</p>
        <div class="stack">
          <label class="field">
            Tracking
            <select v-model="settings.trackingMode">
              <option value="body">Hele lichaam</option>
              <option value="face">Gezicht</option>
            </select>
          </label>
          <label class="field">
            Apparaat
            <select v-model="settings.deviceId">
              <option value="">Automatisch</option>
              <option v-for="device in devices" :key="device.deviceId" :value="device.deviceId">
                {{ device.label }}
              </option>
            </select>
          </label>
          <label class="field">
            Richting
            <select v-model="settings.facing">
              <option value="user">Front</option>
              <option value="environment">Back</option>
            </select>
          </label>
          <label class="field">
            Resolutie
            <select v-model="resolution">
              <option value="640x480">640 × 480</option>
              <option value="1280x720">1280 × 720</option>
              <option value="1920x1080">1920 × 1080</option>
            </select>
          </label>
          <div class="row">
            <button type="button" :disabled="cameraOn || starting" @click="start">Start camera</button>
            <button type="button" class="danger" :disabled="!cameraOn" @click="stop">Stop</button>
          </div>
          <p v-if="trackerStatus" class="muted">{{ trackerStatus }}</p>
          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        </div>
      </section>

      <section class="panel">
        <LoopAnimationBar v-model="settings.loopAnimation" />
      </section>

      <FaceFigurePicker v-model="settings.halloweenFigure" />

      <section class="panel">
        <p class="kicker">Sessie</p>
        <div class="stack">
          <label class="field">
            Code
            <input :value="sessionId" readonly />
          </label>
          <label class="field">
            Naam
            <input v-model="clientName" placeholder="Phone John" />
          </label>
          <RouterLink :to="`/stage/${sessionId}`">Open stage van deze sessie</RouterLink>
        </div>
      </section>
      <PhoneConnect :path="`/sensor/${sessionId}`" />
    </aside>
  </main>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  LOOP_ANIMATIONS,
  type LoopAnimationId,
  type TrackingFrame,
  type TrackingMode,
} from '@halloweenpuppet/shared';
import DebugOverlay from '../components/DebugOverlay.vue';
import FaceFigurePicker from '../components/FaceFigurePicker.vue';
import LoopAnimationBar from '../components/LoopAnimationBar.vue';
import PhoneConnect from '../components/PhoneConnect.vue';
import { loopAnimationMeta } from '../animation/LoopAnimationPlayer';
import { SocketIoTrackingTransport } from '../networking/SocketIoTrackingTransport';
import { useSessionStore } from '../stores/session';
import { useSettingsStore } from '../stores/settings';
import { listCameraDevices, startCamera, stopCamera, type CameraDevice } from '../tracking/camera';
import { FpsCounter } from '../tracking/FpsCounter';
import { MediaPipeTracker } from '../tracking/MediaPipeTracker';
import { SkeletonOverlay } from '../tracking/SkeletonOverlay';

const TARGET_INTERVAL_MS = 1000 / 30;

const route = useRoute();
const sessionStore = useSessionStore();
const settings = useSettingsStore();
const { sessionId, clientId, clientName, connectionState, latencyMs } = storeToRefs(sessionStore);

const videoRef = ref<HTMLVideoElement | null>(null);
const overlayRef = ref<HTMLCanvasElement | null>(null);
const devices = ref<CameraDevice[]>([]);
const cameraOn = ref(false);
const starting = ref(false);
const errorMessage = ref('');
const trackingFps = ref(0);
const renderFps = ref(0);
const personCount = ref(0);
const poseConfidence = ref(0);
const faceConfidence = ref(0);
const glassesPresent = ref(false);
const glassesConfidence = ref(0);
const trackerStatus = ref('');
const loopAnimations = LOOP_ANIMATIONS;
const activeLoop = computed(() => loopAnimationMeta(settings.loopAnimation));

const resolution = computed({
  get: () => `${settings.width}x${settings.height}`,
  set: (value: string) => {
    const [width, height] = value.split('x').map(Number);
    settings.width = width;
    settings.height = height;
  },
});

const transport = new SocketIoTrackingTransport();
const tracker = new MediaPipeTracker();
const trackingMeter = new FpsCounter();
const renderMeter = new FpsCounter();
let overlay: SkeletonOverlay | null = null;
let rafId = 0;
let lastDetect = 0;
let lastPing = 0;
let latestFrame: ReturnType<MediaPipeTracker['detect']> = null;
let running = false;

onMounted(async () => {
  sessionStore.setSessionId(String(route.params.sessionId ?? sessionStore.sessionId));
  overlay = overlayRef.value ? new SkeletonOverlay(overlayRef.value) : null;
  bindTransport();
  await connect();
  devices.value = await listCameraDevices();
  window.addEventListener('resize', drawIdle);
  watch(
    () => settings.trackingMode,
    (mode) => {
      void applyTrackingMode(mode);
    },
  );
  watch(
    () => settings.halloweenFigure,
    (halloweenFigure) => {
      transport.sendSettings({ halloweenFigure });
    },
  );
  watch(
    () => settings.loopAnimation,
    (loopAnimation) => {
      const meta = loopAnimationMeta(loopAnimation);
      if (meta) {
        settings.trackingMode = meta.mode;
      }
      transport.sendSettings({ loopAnimation });
    },
  );
});

onUnmounted(() => {
  window.removeEventListener('resize', drawIdle);
  stop();
  tracker.close();
  transport.disconnect();
});

function bindTransport(): void {
  transport.onConnectionState((state) => {
    sessionStore.connectionState = state;
  });
  transport.onLatency((rtt) => {
    sessionStore.latencyMs = rtt;
  });
  transport.onSession((snapshot) => {
    sessionStore.snapshot = snapshot;
    applySessionSettings(snapshot.settings);
  });
  transport.onSettings((sessionSettings) => {
    applySessionSettings(sessionSettings);
  });
}

async function connect(): Promise<void> {
  try {
    sessionStore.clientId = await transport.connect({
      sessionId: sessionStore.sessionId,
      role: 'sensor',
      name: sessionStore.clientName || 'Sensor',
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Verbinding mislukt';
  }
}

async function start(): Promise<void> {
  if (!videoRef.value) {
    return;
  }
  starting.value = true;
  errorMessage.value = '';
  try {
    await startCamera(videoRef.value, {
      deviceId: settings.deviceId || undefined,
      facing: settings.facing,
      width: settings.width,
      height: settings.height,
    });
    devices.value = await listCameraDevices();
    trackerStatus.value = settings.trackingMode === 'face' ? 'Gezichtsmodel laden…' : 'Lichaamsmodel laden…';
    await tracker.init(settings.trackingMode);
    trackerStatus.value = '';
    cameraOn.value = true;
    running = true;
    lastDetect = 0;
    rafId = requestAnimationFrame(loop);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Camera kon niet worden gestart. Gebruik HTTPS of localhost.';
    stop();
  } finally {
    starting.value = false;
  }
}

function stop(): void {
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  if (videoRef.value) {
    stopCamera(videoRef.value);
  }
  overlay?.clear();
  cameraOn.value = false;
  personCount.value = 0;
  poseConfidence.value = 0;
  faceConfidence.value = 0;
  glassesPresent.value = false;
  glassesConfidence.value = 0;
  trackerStatus.value = '';
}

function loop(now: number): void {
  if (!running) {
    return;
  }
  rafId = requestAnimationFrame(loop);
  renderFps.value = renderMeter.tick(now);
  const video = videoRef.value;
  if (!video) {
    return;
  }

  if (now - lastDetect >= TARGET_INTERVAL_MS) {
    lastDetect = now;
    latestFrame = tracker.detect(video, sessionStore.clientId, now);
    if (latestFrame) {
      transport.sendFrame(latestFrame);
      trackingFps.value = trackingMeter.tick(now);
      personCount.value = 1;
      poseConfidence.value = latestFrame.pose?.confidence ?? 0;
      faceConfidence.value = latestFrame.face?.confidence ?? 0;
      glassesPresent.value = latestFrame.glasses?.present ?? false;
      glassesConfidence.value = latestFrame.glasses?.confidence ?? 0;
    } else {
      personCount.value = 0;
      poseConfidence.value = 0;
      faceConfidence.value = 0;
      glassesPresent.value = false;
      glassesConfidence.value = 0;
    }
  }
  if (now - lastPing >= 1000) {
    lastPing = now;
    transport.measureLatency();
  }

  if (settings.showDebugSkeleton) {
    overlay?.draw(latestFrame, video.videoWidth, video.videoHeight);
  } else {
    overlay?.clear();
  }
}

function drawIdle(): void {
  const video = videoRef.value;
  if (video && settings.showDebugSkeleton) {
    overlay?.draw(null, video.videoWidth, video.videoHeight);
  }
}

async function applyTrackingMode(mode: TrackingMode): Promise<void> {
  tracker.setMode(mode);
  transport.sendFrame(modeFrame(mode));
  if (!cameraOn.value) {
    return;
  }
  trackerStatus.value = mode === 'face' ? 'Gezichtsmodel laden…' : 'Lichaamsmodel laden…';
  try {
    await tracker.init(mode);
    trackerStatus.value = '';
  } catch (error) {
    trackerStatus.value = '';
    errorMessage.value = error instanceof Error ? error.message : 'Trackingmodel kon niet worden geladen';
  }
}

function applySessionSettings(sessionSettings: { halloweenFigure?: string; loopAnimation?: LoopAnimationId | null }): void {
  if (sessionSettings.halloweenFigure) {
    settings.halloweenFigure = sessionSettings.halloweenFigure as typeof settings.halloweenFigure;
  }
  if (sessionSettings.loopAnimation !== undefined) {
    settings.loopAnimation = sessionSettings.loopAnimation;
  }
}

function toggleLoop(id: LoopAnimationId): void {
  settings.loopAnimation = settings.loopAnimation === id ? null : id;
}

function modeFrame(mode: TrackingMode): TrackingFrame {
  return {
    type: 'tracking-frame',
    clientId: sessionStore.clientId,
    timestamp: performance.now(),
    personId: 1,
    mode,
    pose: null,
    face: null,
    hands: null,
    blendShapes: [],
    glasses: null,
  };
}
</script>

<style scoped>
.sensor {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 22rem;
}

.viewport {
  position: relative;
  background: #000;
  min-height: 100vh;
}

video,
canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

canvas {
  pointer-events: none;
}

.loop-hud {
  position: absolute;
  left: 0.8rem;
  right: 0.8rem;
  bottom: 4.6rem;
  display: grid;
  gap: 0.45rem;
  pointer-events: none;
  z-index: 2;
}

.loop-banner {
  margin: 0;
  padding: 0.45rem 0.7rem;
  border-radius: 10px;
  background: rgba(124, 255, 178, 0.92);
  color: #102016;
  font-weight: 700;
  font-size: 0.9rem;
}

.loop-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  pointer-events: auto;
}

.loop-strip button {
  min-height: 2.3rem;
  padding: 0.4rem 0.7rem;
  background: rgba(42, 35, 51, 0.88);
  color: var(--text);
}

.loop-strip button.active {
  background: var(--accent);
  color: #102016;
}

.privacy {
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: 1rem;
  margin: 0;
  padding: 0.7rem 0.85rem;
  border-radius: 12px;
  background: rgba(10, 8, 12, 0.7);
}

.sidebar {
  display: grid;
  align-content: start;
  gap: 0.8rem;
  padding: 0.8rem;
}

.stack {
  display: grid;
  gap: 0.7rem;
}

.error {
  margin: 0;
  color: var(--danger);
  font-size: 0.85rem;
}

@media (max-width: 900px) {
  .sensor {
    grid-template-columns: 1fr;
  }

  .viewport {
    min-height: 55vh;
  }
}
</style>
