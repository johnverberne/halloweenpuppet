export const DEFAULT_TRACK_URL = '/tracks/in-de-zevenster-4.mp3';
export const DEFAULT_TRACK_TITLE = 'In De Zevenster 4';

export type MusicStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';

export class MusicPlayer {
  private readonly audio = new Audio();
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private analyser: AnalyserNode | null = null;
  private objectUrl: string | null = null;
  title = DEFAULT_TRACK_TITLE;
  status: MusicStatus = 'idle';
  errorMessage = '';

  constructor() {
    this.audio.preload = 'auto';
    this.audio.setAttribute('playsinline', 'true');
    this.audio.addEventListener('playing', () => {
      this.status = 'playing';
    });
    this.audio.addEventListener('pause', () => {
      if (this.status !== 'idle') {
        this.status = 'paused';
      }
    });
    this.audio.addEventListener('error', () => {
      this.status = 'error';
      this.errorMessage = 'Audio kon niet worden geladen';
    });
  }

  async loadUrl(url: string, title = DEFAULT_TRACK_TITLE): Promise<void> {
    this.revokeObjectUrl();
    this.title = title;
    this.status = 'loading';
    this.errorMessage = '';
    this.audio.src = url;
    this.audio.load();
    try {
      await this.waitForReady();
      this.status = 'ready';
    } catch (error) {
      this.status = 'error';
      this.errorMessage = error instanceof Error ? error.message : 'Audio kon niet worden geladen';
      throw error;
    }
  }

  async loadFile(file: File): Promise<void> {
    this.revokeObjectUrl();
    this.title = file.name.replace(/\.[^.]+$/, '');
    this.status = 'loading';
    this.errorMessage = '';
    this.objectUrl = URL.createObjectURL(file);
    this.audio.src = this.objectUrl;
    try {
      await this.waitForReady();
      this.status = 'ready';
    } catch (error) {
      this.status = 'error';
      this.errorMessage = error instanceof Error ? error.message : 'Audio kon niet worden geladen';
      throw error;
    }
  }

  async arm(): Promise<void> {
    this.ensureGraph();
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
  }

  async play(): Promise<void> {
    await this.arm();
    try {
      await this.audio.play();
      this.status = 'playing';
      this.errorMessage = '';
    } catch (error) {
      this.status = 'error';
      this.errorMessage = 'Browser blokkeerde afspelen. Klik Play opnieuw.';
      throw error;
    }
  }

  pause(): void {
    this.audio.pause();
    this.status = 'paused';
  }

  toggle(): void {
    if (this.audio.paused) {
      void this.play();
      return;
    }
    this.pause();
  }

  seek(seconds: number): void {
    if (!Number.isFinite(this.audio.duration)) {
      return;
    }
    this.audio.currentTime = Math.min(this.duration, Math.max(0, seconds));
  }

  setVolume(volume: number): void {
    const next = Math.min(1, Math.max(0, volume));
    this.audio.volume = next;
    if (this.gain) {
      this.gain.gain.value = next;
    }
  }

  get currentTime(): number {
    return this.audio.currentTime;
  }

  get duration(): number {
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }

  get paused(): boolean {
    return this.audio.paused;
  }

  getAudioStream(): MediaStream {
    this.ensureGraph();
    return this.destination?.stream ?? new MediaStream();
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  dispose(): void {
    this.pause();
    this.revokeObjectUrl();
    this.audio.removeAttribute('src');
    void this.context?.close();
    this.context = null;
    this.source = null;
    this.gain = null;
    this.destination = null;
    this.analyser = null;
  }

  private ensureGraph(): void {
    if (this.context) {
      return;
    }
    const context = new AudioContext();
    this.context = context;
    this.source = context.createMediaElementSource(this.audio);
    this.gain = context.createGain();
    this.destination = context.createMediaStreamDestination();
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.55;
    this.gain.gain.value = this.audio.volume;
    this.source.connect(this.analyser);
    this.analyser.connect(this.gain);
    this.gain.connect(context.destination);
    this.gain.connect(this.destination);
  }

  private waitForReady(): Promise<void> {
    if (this.audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const onReady = (): void => {
        cleanup();
        resolve();
      };
      const onError = (): void => {
        cleanup();
        reject(new Error('Audio kon niet worden geladen'));
      };
      const cleanup = (): void => {
        this.audio.removeEventListener('canplay', onReady);
        this.audio.removeEventListener('error', onError);
      };
      this.audio.addEventListener('canplay', onReady);
      this.audio.addEventListener('error', onError);
    });
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
