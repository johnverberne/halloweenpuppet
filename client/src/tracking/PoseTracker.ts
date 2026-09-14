import { FilesetResolver, PoseLandmarker, type PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import type { PosePayload } from '@halloweenpuppet/shared';
import { averageVisibility, MEDIAPIPE_WASM_URL, toLandmarks } from './landmarks';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

export class PoseTracker {
  private landmarker: PoseLandmarker | null = null;

  async init(): Promise<void> {
    if (this.landmarker) {
      return;
    }
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
    const options = {
      runningMode: 'VIDEO' as const,
      numPoses: 1,
      minPoseDetectionConfidence: 0.4,
      minPosePresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    };
    try {
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      });
    } catch {
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
      });
    }
  }

  detect(video: HTMLVideoElement, timestampMs: number): PosePayload | null {
    if (!this.landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return null;
    }
    const result: PoseLandmarkerResult = this.landmarker.detectForVideo(video, timestampMs);
    const pose = result.landmarks[0];
    if (!pose || pose.length === 0) {
      return null;
    }
    const world = result.worldLandmarks[0] ?? [];
    return {
      landmarks: toLandmarks(pose),
      worldLandmarks: toLandmarks(world),
      confidence: averageVisibility(pose),
    };
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
