import type { TrackingFrame } from '@halloweenpuppet/shared';
import type { LipSyncFrame, LipSyncProvider } from './LipSyncProvider';

export class FaceTrackingLipSyncProvider implements LipSyncProvider {
  private latest: TrackingFrame | null = null;

  setFrame(frame: TrackingFrame | null): void {
    this.latest = frame;
  }

  update(timestamp: number): LipSyncFrame {
    const jawOpen =
      this.latest?.blendShapes?.find((item) => item.categoryName === 'jawOpen')?.score ?? 0;
    const mouthOpen = Math.min(1, Math.max(0, jawOpen));
    return {
      timestamp,
      mouthOpen,
      viseme: mouthOpen < 0.07 ? 'sil' : 'aa',
      visemes: { aa: mouthOpen, ee: 0, ih: 0, oh: 0, ou: 0 },
    };
  }
}
