import { PoseLandmark, type Landmark, type TrackingFrame, type TrackingMode } from '@halloweenpuppet/shared';
import { FaceTracker } from './FaceTracker';
import { PersonMatcher } from './PersonMatcher';
import { PoseTracker } from './PoseTracker';

export class MediaPipeTracker {
  private readonly pose = new PoseTracker();
  private readonly face = new FaceTracker();
  private readonly matcher = new PersonMatcher();
  private mode: TrackingMode = 'body';
  private maxPersons: 1 | 2 = 1;
  private poseReady = false;
  private faceReady = false;

  setMode(mode: TrackingMode): void {
    this.mode = mode;
  }

  setMaxPersons(maxPersons: 1 | 2): void {
    if (this.maxPersons !== maxPersons) {
      this.matcher.reset();
    }
    this.maxPersons = maxPersons;
  }

  async init(mode: TrackingMode = this.mode): Promise<void> {
    this.mode = mode;
    if (mode === 'face') {
      await this.face.init(this.maxPersons);
      this.faceReady = true;
      return;
    }
    await this.pose.init(this.maxPersons);
    this.poseReady = true;
  }

  detect(video: HTMLVideoElement, clientId: string, timestampMs: number): TrackingFrame | null {
    return this.detectAll(video, clientId, timestampMs)[0] ?? null;
  }

  detectAll(video: HTMLVideoElement, clientId: string, timestampMs: number): TrackingFrame[] {
    if (this.mode === 'face') {
      if (!this.faceReady) {
        return [];
      }
      const detected = this.face.detectAll(video, timestampMs);
      const ids = this.matcher.assign(
        detected.map((item) => faceCenter(item.face.landmarks)),
        timestampMs,
        this.maxPersons,
      );
      return detected.map((item, index) => ({
        type: 'tracking-frame' as const,
        clientId,
        timestamp: timestampMs,
        personId: ids[index] ?? 1,
        mode: 'face' as const,
        pose: null,
        face: item.face,
        hands: null,
        blendShapes: item.blendShapes,
        glasses: item.glasses,
      }));
    }

    if (!this.poseReady) {
      return [];
    }
    const poses = this.pose.detectAll(video, timestampMs);
    const ids = this.matcher.assign(
      poses.map((item) => torsoCenter(item.landmarks)),
      timestampMs,
      this.maxPersons,
    );
    return poses.map((pose, index) => ({
      type: 'tracking-frame' as const,
      clientId,
      timestamp: timestampMs,
      personId: ids[index] ?? 1,
      mode: 'body' as const,
      pose,
      face: null,
      hands: null,
      blendShapes: [],
      glasses: null,
    }));
  }

  close(): void {
    this.pose.close();
    this.face.close();
    this.matcher.reset();
    this.poseReady = false;
    this.faceReady = false;
  }
}

function torsoCenter(landmarks: Landmark[]): { x: number; y: number } {
  const left = landmarks[PoseLandmark.leftHip];
  const right = landmarks[PoseLandmark.rightHip];
  if (left && right) {
    return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  }
  const nose = landmarks[PoseLandmark.nose];
  return { x: nose?.x ?? 0.5, y: nose?.y ?? 0.5 };
}

function faceCenter(landmarks: Landmark[]): { x: number; y: number } {
  const nose = landmarks[1] ?? landmarks[4] ?? landmarks[0];
  return { x: nose?.x ?? 0.5, y: nose?.y ?? 0.5 };
}
