import type { TrackingFrame, TrackingMode } from '@halloweenpuppet/shared';
import { FaceTracker } from './FaceTracker';
import { PoseTracker } from './PoseTracker';

export class MediaPipeTracker {
  private readonly pose = new PoseTracker();
  private readonly face = new FaceTracker();
  private mode: TrackingMode = 'body';
  private poseReady = false;
  private faceReady = false;

  setMode(mode: TrackingMode): void {
    this.mode = mode;
  }

  async init(mode: TrackingMode = this.mode): Promise<void> {
    this.mode = mode;
    if (mode === 'face') {
      await this.face.init();
      this.faceReady = true;
      return;
    }
    await this.pose.init();
    this.poseReady = true;
  }

  detect(video: HTMLVideoElement, clientId: string, timestampMs: number): TrackingFrame | null {
    if (this.mode === 'face') {
      if (!this.faceReady) {
        return null;
      }
      const detected = this.face.detect(video, timestampMs);
      if (!detected) {
        return null;
      }
      return {
        type: 'tracking-frame',
        clientId,
        timestamp: timestampMs,
        personId: 1,
        mode: 'face',
        pose: null,
        face: detected.face,
        hands: null,
        blendShapes: detected.blendShapes,
        glasses: detected.glasses,
      };
    }

    if (!this.poseReady) {
      return null;
    }
    const pose = this.pose.detect(video, timestampMs);
    if (!pose) {
      return null;
    }
    return {
      type: 'tracking-frame',
      clientId,
      timestamp: timestampMs,
      personId: 1,
      mode: 'body',
      pose,
      face: null,
      hands: null,
      blendShapes: [],
      glasses: null,
    };
  }

  close(): void {
    this.pose.close();
    this.face.close();
    this.poseReady = false;
    this.faceReady = false;
  }
}
