import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { HalloweenFigureId, LoopAnimationId, TrackingMode } from '@halloweenpuppet/shared';
import type { CameraFacing } from '../tracking/camera';

export const useSettingsStore = defineStore('settings', () => {
  const facing = ref<CameraFacing>('user');
  const deviceId = ref('');
  const width = ref(1280);
  const height = ref(720);
  const trackingMode = ref<TrackingMode>('body');
  const halloweenFigure = ref<HalloweenFigureId>('pumpkin');
  const loopAnimation = ref<LoopAnimationId | null>(null);
  const smoothing = ref(0.35);
  const showDebugSkeleton = ref(true);
  const showHumanoid = ref(true);
  const showVrm = ref(true);
  const lipSyncSource = ref<'audio' | 'face' | 'mix'>('audio');

  return {
    facing,
    deviceId,
    width,
    height,
    trackingMode,
    halloweenFigure,
    loopAnimation,
    smoothing,
    showDebugSkeleton,
    showHumanoid,
    showVrm,
    lipSyncSource,
  };
});
