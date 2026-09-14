import type { GlassesPayload, Landmark } from '@halloweenpuppet/shared';

const LM = {
  leftEyeOuter: 33,
  leftEyeInner: 133,
  leftEyeTop: 159,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  rightEyeTop: 386,
  noseBridge: 6,
  glabella: 168,
  leftTemple: 234,
  rightTemple: 454,
  leftCheek: 50,
  rightCheek: 280,
  leftBrow: 105,
  rightBrow: 334,
} as const;

const ON_THRESHOLD = 4;
const OFF_THRESHOLD = 2;
const MAX_STREAK = 10;

export class GlassesDetector {
  private readonly canvas = document.createElement('canvas');
  private readonly ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  private streak = 0;
  private worn = false;

  detect(video: HTMLVideoElement, landmarks: Landmark[]): GlassesPayload {
    const raw = this.scoreFrame(video, landmarks);
    if (raw >= 0.38) {
      this.streak = Math.min(MAX_STREAK, this.streak + 1);
    } else {
      this.streak = Math.max(0, this.streak - 1);
    }
    if (this.streak >= ON_THRESHOLD) {
      this.worn = true;
    } else if (this.streak <= OFF_THRESHOLD) {
      this.worn = false;
    }
    return {
      present: this.worn,
      confidence: Math.max(raw, this.streak / MAX_STREAK),
    };
  }

  reset(): void {
    this.streak = 0;
    this.worn = false;
  }

  private scoreFrame(video: HTMLVideoElement, landmarks: Landmark[]): number {
    const ctx = this.ctx;
    if (!ctx || video.videoWidth < 16 || landmarks.length < 400) {
      return 0;
    }
    const width = 320;
    const height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * width));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    ctx.drawImage(video, 0, 0, width, height);

    const luma = (index: number, ox = 0, oy = 0): number => {
      const point = landmarks[index];
      if (!point) {
        return 0.5;
      }
      return sampleLuma(ctx, (point.x + ox) * width, (point.y + oy) * height);
    };
    const pathEdge = (a: number, b: number, ox = 0, oy = 0): number => {
      const from = landmarks[a];
      const to = landmarks[b];
      if (!from || !to) {
        return 0;
      }
      return pathContrast(
        ctx,
        (from.x + ox) * width,
        (from.y + oy) * height,
        (to.x + ox) * width,
        (to.y + oy) * height,
      );
    };

    const cheek = (luma(LM.leftCheek) + luma(LM.rightCheek)) / 2;
    const forehead = luma(LM.glabella, 0, -0.04);
    const skin = (cheek + forehead) / 2;
    const bridge = (luma(LM.noseBridge, 0, -0.012) + luma(LM.glabella, 0, 0.01)) / 2;
    const bridgeDark = Math.max(0, skin - bridge);
    const rim =
      (pathEdge(LM.leftBrow, LM.leftEyeTop, 0, 0.008) +
        pathEdge(LM.rightBrow, LM.rightEyeTop, 0, 0.008) +
        pathEdge(LM.leftEyeInner, LM.rightEyeInner, 0, -0.012)) /
      3;
    const templeDark =
      (Math.max(0, skin - luma(LM.leftTemple, 0.01, 0)) +
        Math.max(0, skin - luma(LM.rightTemple, -0.01, 0))) /
      2;
    const frameLine = pathEdge(LM.leftEyeOuter, LM.rightEyeOuter, 0, -0.02);

    return clamp01(bridgeDark * 2.4 + rim * 1.8 + templeDark * 1.3 + frameLine * 1.1);
  }
}

function sampleLuma(ctx: CanvasRenderingContext2D, x: number, y: number): number {
  const px = Math.min(ctx.canvas.width - 1, Math.max(0, Math.round(x)));
  const py = Math.min(ctx.canvas.height - 1, Math.max(0, Math.round(y)));
  const pixel = ctx.getImageData(px, py, 1, 1).data;
  return (pixel[0] * 0.299 + pixel[1] * 0.587 + pixel[2] * 0.114) / 255;
}

function pathContrast(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const steps = 8;
  let previous = sampleLuma(ctx, x1, y1);
  let total = 0;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const next = sampleLuma(ctx, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
    total += Math.abs(next - previous);
    previous = next;
  }
  return total / steps;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
