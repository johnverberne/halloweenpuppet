import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { POSE_CONNECTIONS, type Landmark, type TrackingFrame } from '@halloweenpuppet/shared';

interface DrawBox {
  offsetX: number;
  offsetY: number;
  drawWidth: number;
  drawHeight: number;
}

export class SkeletonOverlay {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  draw(frame: TrackingFrame | null, sourceWidth: number, sourceHeight: number, flipX = false): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    ctx.clearRect(0, 0, width, height);
    if (!frame || sourceWidth === 0 || sourceHeight === 0) {
      return;
    }

    const box = letterbox(width, height, sourceWidth, sourceHeight);
    if (flipX) {
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    if (frame.mode === 'face' || frame.face) {
      this.drawFace(ctx, frame.face?.landmarks ?? [], box);
      if (frame.glasses?.present) {
        this.drawGlasses(ctx, frame.face?.landmarks ?? [], box);
      }
    } else {
      this.drawPose(ctx, frame.pose?.landmarks ?? [], box);
    }
    if (flipX) {
      ctx.restore();
    }
  }

  clear(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawPose(ctx: CanvasRenderingContext2D, landmarks: Landmark[], box: DrawBox): void {
    if (landmarks.length === 0) {
      return;
    }
    strokeConnections(ctx, landmarks, POSE_CONNECTIONS, box, '#7CFFB2', 2);
    fillPoints(ctx, landmarks, box, '#F8FF6B', 3.5);
  }

  private drawFace(ctx: CanvasRenderingContext2D, landmarks: Landmark[], box: DrawBox): void {
    if (landmarks.length === 0) {
      return;
    }
    const groups: Array<[readonly { start: number; end: number }[], string]> = [
      [FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, '#7CFFB2'],
      [FaceLandmarker.FACE_LANDMARKS_LIPS, '#ff8ab8'],
      [FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, '#F8FF6B'],
      [FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, '#F8FF6B'],
      [FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, '#9ad0ff'],
      [FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, '#9ad0ff'],
      [FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, '#ffffff'],
      [FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, '#ffffff'],
    ];
    for (const [connections, color] of groups) {
      strokeConnections(
        ctx,
        landmarks,
        connections.map((item) => [item.start, item.end] as const),
        box,
        color,
        1.4,
      );
    }
  }

  private drawGlasses(ctx: CanvasRenderingContext2D, landmarks: Landmark[], box: DrawBox): void {
    const leftOuter = landmarks[33];
    const leftInner = landmarks[133];
    const rightInner = landmarks[362];
    const rightOuter = landmarks[263];
    const leftTemple = landmarks[234];
    const rightTemple = landmarks[454];
    if (!leftOuter || !leftInner || !rightInner || !rightOuter) {
      return;
    }
    ctx.save();
    ctx.strokeStyle = '#f4d35e';
    ctx.lineWidth = Math.max(2.5, ctx.canvas.width / 180);
    ctx.lineCap = 'round';
    ellipseFrom(ctx, leftOuter, leftInner, box, 0.72);
    ellipseFrom(ctx, rightInner, rightOuter, box, 0.72);
    ctx.beginPath();
    ctx.moveTo(px(leftInner, box), py(leftInner, box));
    ctx.lineTo(px(rightInner, box), py(rightInner, box));
    if (leftTemple) {
      ctx.moveTo(px(leftOuter, box), py(leftOuter, box));
      ctx.lineTo(px(leftTemple, box), py(leftTemple, box));
    }
    if (rightTemple) {
      ctx.moveTo(px(rightOuter, box), py(rightOuter, box));
      ctx.lineTo(px(rightTemple, box), py(rightTemple, box));
    }
    ctx.stroke();
    ctx.restore();
  }
}

function px(point: Landmark, box: DrawBox): number {
  return box.offsetX + point.x * box.drawWidth;
}

function py(point: Landmark, box: DrawBox): number {
  return box.offsetY + point.y * box.drawHeight;
}

function ellipseFrom(
  ctx: CanvasRenderingContext2D,
  a: Landmark,
  b: Landmark,
  box: DrawBox,
  heightScale: number,
): void {
  const cx = (px(a, box) + px(b, box)) / 2;
  const cy = (py(a, box) + py(b, box)) / 2;
  const rx = Math.hypot(px(b, box) - px(a, box), py(b, box) - py(a, box)) * 0.62;
  const ry = rx * heightScale;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function letterbox(width: number, height: number, sourceWidth: number, sourceHeight: number): DrawBox {
  const sourceRatio = sourceWidth / sourceHeight;
  const canvasRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let offsetX = 0;
  let offsetY = 0;
  if (sourceRatio > canvasRatio) {
    drawHeight = width / sourceRatio;
    offsetY = (height - drawHeight) / 2;
  } else {
    drawWidth = height * sourceRatio;
    offsetX = (width - drawWidth) / 2;
  }
  return { offsetX, offsetY, drawWidth, drawHeight };
}

function strokeConnections(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  connections: ReadonlyArray<readonly [number, number]>,
  box: DrawBox,
  color: string,
  widthScale: number,
): void {
  ctx.lineWidth = Math.max(widthScale, ctx.canvas.width / 280);
  ctx.strokeStyle = color;
  ctx.beginPath();
  for (const [from, to] of connections) {
    const a = landmarks[from];
    const b = landmarks[to];
    if (!a || !b || (a.visibility ?? 1) < 0.3 || (b.visibility ?? 1) < 0.3) {
      continue;
    }
    ctx.moveTo(box.offsetX + a.x * box.drawWidth, box.offsetY + a.y * box.drawHeight);
    ctx.lineTo(box.offsetX + b.x * box.drawWidth, box.offsetY + b.y * box.drawHeight);
  }
  ctx.stroke();
}

function fillPoints(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  box: DrawBox,
  color: string,
  radius: number,
): void {
  ctx.fillStyle = color;
  for (const point of landmarks) {
    if ((point.visibility ?? 1) < 0.3) {
      continue;
    }
    ctx.beginPath();
    ctx.arc(box.offsetX + point.x * box.drawWidth, box.offsetY + point.y * box.drawHeight, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
