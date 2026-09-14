import { FilesetResolver, PoseLandmarker, type PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import type { PosePayload } from '@halloweenpuppet/shared';
import { averageVisibility, MEDIAPIPE_WASM_URL, toLandmarks } from './landmarks';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

export class PoseTracker {
  private landmarker: PoseLandmarker | null = null;
  private numPoses = 1;

  async init(numPoses = 1): Promise<void> {
    const next = numPoses > 1 ? 2 : 1;
    if (this.landmarker && this.numPoses === next) {
      return;
    }
    this.close();
    this.numPoses = next;
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
    const options = {
      runningMode: 'VIDEO' as const,
      numPoses: this.numPoses,
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
    return this.detectAll(video, timestampMs)[0] ?? null;
  }

  detectAll(video: HTMLVideoElement, timestampMs: number): PosePayload[] {
    if (!this.landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return [];
    }
    const result: PoseLandmarkerResult = this.landmarker.detectForVideo(video, timestampMs);
    return result.landmarks
      .map((pose, index) => {
        if (!pose || pose.length === 0) {
          return null;
        }
        const world = result.worldLandmarks[index] ?? [];
        return {
          landmarks: toLandmarks(pose),
          worldLandmarks: toLandmarks(world),
          confidence: averageVisibility(pose),
        } satisfies PosePayload;
      })
      .filter((item): item is PosePayload => item !== null);
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
