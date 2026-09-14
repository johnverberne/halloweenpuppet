export type RecorderState = 'idle' | 'recording' | 'ready';

export interface RecordOptions {
  width?: number;
  height?: number;
  fps?: number;
}

const PORTRAIT = { width: 540, height: 960, fps: 30 };

export class StageRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private composeTimer = 0;
  private output: HTMLCanvasElement | null = null;
  blob: Blob | null = null;
  state: RecorderState = 'idle';
  errorMessage = '';

  async start(
    source: HTMLCanvasElement,
    audioStream: MediaStream | null,
    options: RecordOptions = {},
  ): Promise<void> {
    this.resetBlob();
    const width = options.width ?? PORTRAIT.width;
    const height = options.height ?? PORTRAIT.height;
    const fps = options.fps ?? PORTRAIT.fps;
    const output = document.createElement('canvas');
    output.width = width;
    output.height = height;
    this.output = output;
    const ctx = output.getContext('2d');
    if (!ctx) {
      throw new Error('Opnamecanvas niet beschikbaar');
    }

    const draw = (): void => {
      fillCover(ctx, source, width, height);
    };
    draw();
    this.composeTimer = window.setInterval(draw, Math.round(1000 / fps));

    const videoStream = output.captureStream(fps);
    const tracks = [...videoStream.getVideoTracks()];
    if (audioStream) {
      tracks.push(...audioStream.getAudioTracks());
    }
    const mixed = new MediaStream(tracks);
    const mimeType = pickMimeType();
    const recorder = mimeType
      ? new MediaRecorder(mixed, { mimeType, videoBitsPerSecond: 4_000_000 })
      : new MediaRecorder(mixed);
    this.chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
    recorder.onerror = () => {
      this.errorMessage = 'Opname is mislukt';
      this.state = 'idle';
    };
    recorder.start(250);
    this.recorder = recorder;
    this.state = 'recording';
    this.errorMessage = '';
  }

  async stop(): Promise<Blob | null> {
    if (!this.recorder || this.state !== 'recording') {
      return this.blob;
    }
    window.clearInterval(this.composeTimer);
    this.composeTimer = 0;
    const recorder = this.recorder;
    this.recorder = null;
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: recorder.mimeType || 'video/webm' }));
      };
      recorder.stop();
    });
    this.chunks = [];
    this.blob = blob;
    this.state = 'ready';
    this.output = null;
    return blob;
  }

  download(filename = 'halloweenpuppet.webm'): void {
    if (!this.blob) {
      return;
    }
    const url = URL.createObjectURL(this.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  dispose(): void {
    if (this.state === 'recording') {
      void this.stop();
    }
    window.clearInterval(this.composeTimer);
    this.resetBlob();
  }

  private resetBlob(): void {
    this.blob = null;
    this.chunks = [];
    this.state = 'idle';
  }
}

function fillCover(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  width: number,
  height: number,
): void {
  const sourceRatio = source.width / Math.max(1, source.height);
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = source.width;
  let sh = source.height;
  if (sourceRatio > targetRatio) {
    sw = source.height * targetRatio;
    sx = (source.width - sw) / 2;
  } else {
    sh = source.width / targetRatio;
    sy = (source.height - sh) / 2;
  }
  ctx.fillStyle = '#09070d';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
}

function pickMimeType(): string | undefined {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type));
}
