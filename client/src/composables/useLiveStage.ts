import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { SessionSettings, TrackingFrame, TrackingMode } from '@halloweenpuppet/shared';
import { LoopAnimationPlayer } from '../animation/LoopAnimationPlayer';
import { StageScene, type StageLayout } from '../animation/StageScene';
import { SocketIoTrackingTransport } from '../networking/SocketIoTrackingTransport';
import { useSessionStore } from '../stores/session';
import { useSettingsStore } from '../stores/settings';
import { FpsCounter } from '../tracking/FpsCounter';
import { SkeletonOverlay } from '../tracking/SkeletonOverlay';

const FRAME_STALE_MS = 450;

export function useLiveStage(layout: StageLayout = 'stage') {
  const route = useRoute();
  const sessionStore = useSessionStore();
  const settings = useSettingsStore();

  const sceneRef = ref<HTMLCanvasElement | null>(null);
  const overlayRef = ref<HTMLCanvasElement | null>(null);
  const trackingFps = ref(0);
  const renderFps = ref(0);
  const personCount = ref(0);
  const poseConfidence = ref(0);
  const faceConfidence = ref(0);
  const glassesPresent = ref(false);
  const glassesConfidence = ref(0);
  const incomingMode = ref<TrackingMode>('body');
  const avatarStatus = ref('VRM wordt geladen…');
  const frameAgeMs = ref<number | null>(null);

  const transport = new SocketIoTrackingTransport();
  const trackingMeter = new FpsCounter();
  const renderMeter = new FpsCounter();
  const loopPlayer = new LoopAnimationPlayer();
  let scene: StageScene | null = null;
  let overlay: SkeletonOverlay | null = null;
  const latestByPerson = new Map<number, { frame: TrackingFrame; at: number }>();
  let rafId = 0;
  let lastPing = 0;

  onMounted(async () => {
    sessionStore.setSessionId(String(route.params.sessionId ?? sessionStore.sessionId));
    if (sceneRef.value) {
      scene = new StageScene(sceneRef.value);
      scene.setLayout(layout);
      scene.setCast(layout === 'dance' ? settings.danceCast : 'solo');
      scene.setShowSkeleton(settings.showHumanoid);
      scene.setShowAvatar(settings.showVrm);
      scene.setSmoothing(settings.smoothing);
      scene.setFigure(settings.halloweenFigure);
      scene.setFigureB(settings.halloweenFigureB);
      scene.setExaggerationPreset(settings.exaggerationPreset);
    }
    overlay = overlayRef.value ? new SkeletonOverlay(overlayRef.value) : null;
    bindTransport();
    await connect();
    void loadAvatar();
    onResize();
    requestAnimationFrame(onResize);
    window.addEventListener('resize', onResize);
    rafId = requestAnimationFrame(loop);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', onResize);
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    transport.disconnect();
    scene?.dispose();
  });

  watch(
    () => settings.showHumanoid,
    (visible) => scene?.setShowSkeleton(visible),
  );
  watch(
    () => settings.showVrm,
    (visible) => scene?.setShowAvatar(visible),
  );
  watch(
    () => settings.smoothing,
    (value) => scene?.setSmoothing(value),
  );
  watch(
    () => settings.halloweenFigure,
    (figure) => {
      scene?.setFigure(figure);
      transport.sendSettings({ halloweenFigure: figure });
    },
  );
  watch(
    () => settings.halloweenFigureB,
    (figure) => {
      scene?.setFigureB(figure);
      transport.sendSettings({ halloweenFigureB: figure });
    },
  );
  watch(
    () => settings.danceCast,
    (cast) => {
      if (layout === 'dance') {
        scene?.setCast(cast);
      }
      transport.sendSettings({ danceCast: cast });
    },
  );
  watch(
    () => settings.exaggerationPreset,
    (preset) => {
      scene?.setExaggerationPreset(preset);
      transport.sendSettings({ exaggerationPreset: preset });
    },
  );
  watch(incomingMode, (mode) => {
    scene?.setTrackingMode(mode);
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
    transport.onFrame((frame) => {
      latestByPerson.set(frame.personId || 1, { frame, at: performance.now() });
      incomingMode.value = frame.mode ?? (frame.face && !frame.pose ? 'face' : 'body');
      trackingFps.value = trackingMeter.tick();
      refreshPresence();
    });
  }

  async function connect(): Promise<void> {
    try {
      sessionStore.clientId = await transport.connect({
        sessionId: sessionStore.sessionId,
        role: 'stage',
        name:
        layout === 'music'
          ? 'Music'
          : layout === 'dance'
            ? 'Dance'
            : layout === 'halloween'
              ? 'Halloween'
              : 'Stage',
      });
    } catch (error) {
      avatarStatus.value = error instanceof Error ? error.message : 'Verbinding mislukt';
    }
  }

  async function loadAvatar(): Promise<void> {
    try {
      await scene?.loadVrm();
      scene?.setShowAvatar(settings.showVrm);
      avatarStatus.value = scene && scene.actorCount() > 1 ? 'VRM avatars geladen' : 'VRM avatar geladen';
    } catch (error) {
      avatarStatus.value =
        error instanceof Error
          ? `VRM niet geladen, 3D skeleton blijft actief. ${error.message}`
          : 'VRM niet geladen, 3D skeleton blijft actief.';
    }
  }

  function loop(now: number): void {
    rafId = requestAnimationFrame(loop);
    renderFps.value = renderMeter.tick(now);
    pruneStale(now);
    const newest = [...latestByPerson.values()].reduce((latest, item) => Math.max(latest, item.at), 0);
    frameAgeMs.value = newest ? now - newest : null;
    const frames = [...latestByPerson.values()].map((item) => item.frame);
    const primary = latestByPerson.get(1)?.frame ?? frames[0] ?? null;
    const loopId = settings.loopAnimation;
    if (loopId && scene) {
      const sample = loopPlayer.sample(loopId, now);
      incomingMode.value = sample.mode;
      scene.setTrackingMode(sample.mode);
      const count = scene.actorCount();
      for (let index = 0; index < count; index += 1) {
        scene.actor(index)?.controller.applyLoop(loopId, sample);
      }
    } else if (scene) {
      const count = scene.actorCount();
      for (let index = 0; index < count; index += 1) {
        const personId = index + 1;
        const frame = latestByPerson.get(personId)?.frame ?? (count === 1 ? primary : null);
        const actor = scene.actor(index);
        if (!frame) {
          actor?.controller.reset();
          continue;
        }
        actor?.controller.apply(frame);
      }
    }
    scene?.render(now);
    if (settings.showDebugSkeleton) {
      overlay?.draw(frames, layout === 'stage' ? 16 : 9, layout === 'stage' ? 9 : 16, true);
    } else {
      overlay?.clear();
    }
    if (now - lastPing >= 1000) {
      lastPing = now;
      transport.measureLatency();
    }
  }

  function pruneStale(now: number): void {
    for (const [id, item] of latestByPerson) {
      if (now - item.at > FRAME_STALE_MS) {
        latestByPerson.delete(id);
      }
    }
    refreshPresence();
  }

  function refreshPresence(): void {
    const frames = [...latestByPerson.values()].map((item) => item.frame);
    personCount.value = frames.length;
    poseConfidence.value = average(frames.map((frame) => frame.pose?.confidence ?? 0));
    faceConfidence.value = average(frames.map((frame) => frame.face?.confidence ?? 0));
    glassesPresent.value = frames.some((frame) => frame.glasses?.present);
    glassesConfidence.value = average(frames.map((frame) => frame.glasses?.confidence ?? 0));
  }

  function applySessionSettings(sessionSettings: SessionSettings): void {
    if (sessionSettings.halloweenFigure) {
      settings.halloweenFigure = sessionSettings.halloweenFigure;
    }
    if (sessionSettings.halloweenFigureB) {
      settings.halloweenFigureB = sessionSettings.halloweenFigureB;
    }
    if (sessionSettings.loopAnimation !== undefined) {
      settings.loopAnimation = sessionSettings.loopAnimation;
    }
    if (sessionSettings.danceCast) {
      settings.danceCast = sessionSettings.danceCast;
    }
    if (sessionSettings.exaggerationPreset) {
      settings.exaggerationPreset = sessionSettings.exaggerationPreset;
    }
  }

  function onResize(): void {
    const canvas = sceneRef.value;
    if (canvas && scene) {
      scene.resize(canvas.clientWidth, canvas.clientHeight);
    }
  }

  function getCanvas(): HTMLCanvasElement | null {
    return scene?.canvas ?? sceneRef.value;
  }

  return {
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
    resize: onResize,
  };
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
