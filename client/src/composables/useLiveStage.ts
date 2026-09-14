import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { SessionSettings, TrackingFrame, TrackingMode } from '@halloweenpuppet/shared';
import { LoopAnimationPlayer } from '../animation/LoopAnimationPlayer';
import { StageScene } from '../animation/StageScene';
import { AudioVisemeLipSyncProvider } from '../audio/AudioVisemeLipSyncProvider';
import { FaceTrackingLipSyncProvider } from '../audio/FaceTrackingLipSyncProvider';
import type { LipSyncFrame } from '../audio/LipSyncProvider';
import type { MusicPlayer } from '../audio/MusicPlayer';
import { SocketIoTrackingTransport } from '../networking/SocketIoTrackingTransport';
import { useSessionStore } from '../stores/session';
import { useSettingsStore } from '../stores/settings';
import { FpsCounter } from '../tracking/FpsCounter';
import { SkeletonOverlay } from '../tracking/SkeletonOverlay';

export function useLiveStage(layout: 'stage' | 'music' = 'stage') {
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
  const lipSyncMouth = ref(0);
  const lipSyncViseme = ref('sil');

  const transport = new SocketIoTrackingTransport();
  const trackingMeter = new FpsCounter();
  const renderMeter = new FpsCounter();
  const faceLipSync = new FaceTrackingLipSyncProvider();
  const loopPlayer = new LoopAnimationPlayer();
  let audioLipSync: AudioVisemeLipSyncProvider | null = null;
  let scene: StageScene | null = null;
  let overlay: SkeletonOverlay | null = null;
  let latestFrame: TrackingFrame | null = null;
  let rafId = 0;
  let lastPing = 0;

  onMounted(async () => {
    sessionStore.setSessionId(String(route.params.sessionId ?? sessionStore.sessionId));
    if (sceneRef.value) {
      scene = new StageScene(sceneRef.value);
      scene.setLayout(layout);
      scene.setShowSkeleton(settings.showHumanoid);
      scene.setShowAvatar(settings.showVrm);
      scene.smoothing.setNewWeight(settings.smoothing);
      scene.setFigure(settings.halloweenFigure);
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
    (value) => scene?.smoothing.setNewWeight(value),
  );
  watch(
    () => settings.halloweenFigure,
    (figure) => {
      scene?.setFigure(figure);
      transport.sendSettings({ halloweenFigure: figure });
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
      latestFrame = frame;
      incomingMode.value = frame.mode ?? (frame.face && !frame.pose ? 'face' : 'body');
      trackingFps.value = trackingMeter.tick();
      personCount.value = frame.pose || frame.face ? 1 : 0;
      poseConfidence.value = frame.pose?.confidence ?? 0;
      faceConfidence.value = frame.face?.confidence ?? 0;
      glassesPresent.value = frame.glasses?.present ?? false;
      glassesConfidence.value = frame.glasses?.confidence ?? 0;
    });
  }

  async function connect(): Promise<void> {
    try {
      sessionStore.clientId = await transport.connect({
        sessionId: sessionStore.sessionId,
        role: 'stage',
        name: layout === 'music' ? 'Music' : 'Stage',
      });
    } catch (error) {
      avatarStatus.value = error instanceof Error ? error.message : 'Verbinding mislukt';
    }
  }

  async function loadAvatar(): Promise<void> {
    try {
      await scene?.loadVrm();
      scene?.setShowAvatar(settings.showVrm);
      avatarStatus.value = 'VRM avatar geladen';
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
    faceLipSync.setFrame(latestFrame);
    const chosen = chooseLipSync(faceLipSync.update(now), audioLipSync?.update(now) ?? null);
    lipSyncMouth.value = chosen?.mouthOpen ?? 0;
    lipSyncViseme.value = chosen?.viseme ?? 'sil';
    scene?.setAudioLipSync(layout === 'music' || Boolean(chosen && chosen.mouthOpen > 0.01 && settings.lipSyncSource !== 'face'));
    const loopId = settings.loopAnimation;
    if (loopId && scene) {
      const sample = loopPlayer.sample(loopId, now);
      incomingMode.value = sample.mode;
      scene.setTrackingMode(sample.mode);
      scene.controller.applyLoop(loopId, sample, settings.lipSyncSource === 'face' ? null : chosen);
    } else {
      scene?.controller.apply(latestFrame, settings.lipSyncSource === 'face' ? null : chosen);
    }
    scene?.render(now);
    if (settings.showDebugSkeleton) {
      overlay?.draw(latestFrame, layout === 'music' ? 9 : 16, layout === 'music' ? 16 : 9, true);
    } else {
      overlay?.clear();
    }
    if (now - lastPing >= 1000) {
      lastPing = now;
      transport.measureLatency();
    }
  }

  function applySessionSettings(sessionSettings: SessionSettings): void {
    if (sessionSettings.halloweenFigure) {
      settings.halloweenFigure = sessionSettings.halloweenFigure;
    }
    if (sessionSettings.loopAnimation !== undefined) {
      settings.loopAnimation = sessionSettings.loopAnimation;
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

  function attachMusicPlayer(player: MusicPlayer): void {
    audioLipSync = new AudioVisemeLipSyncProvider(
      () => player.getAnalyser(),
      () => !player.paused,
    );
  }

  function chooseLipSync(face: LipSyncFrame, audio: LipSyncFrame | null): LipSyncFrame | null {
    const source = settings.lipSyncSource;
    if (source === 'face' || !audio) {
      return face;
    }
    if (source === 'audio') {
      return audio;
    }
    return {
      timestamp: audio.timestamp,
      mouthOpen: Math.max(face.mouthOpen * 0.35, audio.mouthOpen),
      viseme: audio.viseme ?? face.viseme,
      visemes: {
        aa: Math.max(face.visemes?.aa ?? 0, audio.visemes?.aa ?? 0),
        ee: audio.visemes?.ee ?? 0,
        ih: audio.visemes?.ih ?? 0,
        oh: audio.visemes?.oh ?? 0,
        ou: audio.visemes?.ou ?? 0,
      },
    };
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
    lipSyncMouth,
    lipSyncViseme,
    attachMusicPlayer,
    getCanvas,
    resize: onResize,
  };
}
