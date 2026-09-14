import type { LipSyncFrame, LipSyncProvider, VisemeName } from './LipSyncProvider';

const FFT_SIZE = 2048;

export class AudioVisemeLipSyncProvider implements LipSyncProvider {
  private freq = new Uint8Array(FFT_SIZE / 2);
  private wave = new Uint8Array(FFT_SIZE);
  private peak = 0.08;
  private prevVocal = 0;
  private mouth = 0;
  private visemes: NonNullable<LipSyncFrame['visemes']> = {
    aa: 0,
    ee: 0,
    ih: 0,
    oh: 0,
    ou: 0,
  };

  constructor(
    private readonly getAnalyser: () => AnalyserNode | null,
    private readonly isActive: () => boolean,
  ) {}

  update(timestamp: number): LipSyncFrame {
    const analyser = this.getAnalyser();
    if (!analyser || !this.isActive() || analyser.context.state !== 'running') {
      this.decay();
      return this.frame(timestamp);
    }

    if (this.freq.length !== analyser.frequencyBinCount) {
      this.freq = new Uint8Array(analyser.frequencyBinCount);
      this.wave = new Uint8Array(analyser.fftSize);
    }
    analyser.getByteFrequencyData(this.freq);
    analyser.getByteTimeDomainData(this.wave);
    const sampleRate = analyser.context.sampleRate;
    const fftSize = analyser.fftSize;
    const kick = bandEnergy(this.freq, sampleRate, fftSize, 20, 140);
    const low = bandEnergy(this.freq, sampleRate, fftSize, 200, 800);
    const mid = bandEnergy(this.freq, sampleRate, fftSize, 800, 2000);
    const high = bandEnergy(this.freq, sampleRate, fftSize, 2000, 4000);
    const sibilant = bandEnergy(this.freq, sampleRate, fftSize, 4000, 8000);
    const vocal = Math.max(low, mid, high);
    const rms = timeRms(this.wave);
    const flux = Math.max(0, vocal - this.prevVocal);
    this.prevVocal = vocal;

    this.peak = Math.max(this.peak * 0.993, vocal, rms, 0.03);
    const energy = clamp01((vocal * 1.15 + rms * 1.4 + flux * 2.2 + kick * 0.25) / Math.max(this.peak, 0.08));
    this.mouth += (energy - this.mouth) * 0.38;

    const total = low + mid + high + 1e-4;
    const bright = (mid + high) / total;
    const open = this.mouth;
    const rest = open < 0.07;

    const next = {
      aa: rest ? 0 : open * (0.25 + (low / total) * 0.9),
      oh: rest ? 0 : open * (0.15 + (low / total) * (1 - bright) * 1.1),
      ee: rest ? 0 : open * (0.1 + (high / total) * 1.15 + sibilant * 0.35),
      ih: rest ? 0 : open * (0.12 + (mid / total) * 0.95),
      ou: rest ? 0 : open * (0.08 + (1 - open) * 0.45 * (mid / total)),
    };
    this.visemes = {
      aa: lerp(this.visemes.aa ?? 0, clamp01(next.aa), 0.4),
      oh: lerp(this.visemes.oh ?? 0, clamp01(next.oh), 0.4),
      ee: lerp(this.visemes.ee ?? 0, clamp01(next.ee), 0.4),
      ih: lerp(this.visemes.ih ?? 0, clamp01(next.ih), 0.4),
      ou: lerp(this.visemes.ou ?? 0, clamp01(next.ou), 0.4),
    };

    return this.frame(timestamp);
  }

  private decay(): void {
    this.mouth *= 0.82;
    this.visemes = {
      aa: (this.visemes.aa ?? 0) * 0.8,
      ee: (this.visemes.ee ?? 0) * 0.8,
      ih: (this.visemes.ih ?? 0) * 0.8,
      oh: (this.visemes.oh ?? 0) * 0.8,
      ou: (this.visemes.ou ?? 0) * 0.8,
    };
    this.prevVocal *= 0.9;
  }

  private frame(timestamp: number): LipSyncFrame {
    return {
      timestamp,
      mouthOpen: clamp01(this.mouth),
      viseme: dominantViseme(this.visemes, this.mouth),
      visemes: { ...this.visemes },
    };
  }
}

function dominantViseme(
  visemes: NonNullable<LipSyncFrame['visemes']>,
  mouth: number,
): VisemeName {
  if (mouth < 0.07) {
    return 'sil';
  }
  let best: Exclude<VisemeName, 'sil'> = 'aa';
  let score = 0;
  for (const [name, value] of Object.entries(visemes) as Array<[Exclude<VisemeName, 'sil'>, number]>) {
    if ((value ?? 0) > score) {
      score = value ?? 0;
      best = name;
    }
  }
  return best;
}

function bandEnergy(data: Uint8Array, sampleRate: number, fftSize: number, fromHz: number, toHz: number): number {
  const binHz = sampleRate / fftSize;
  const start = Math.max(0, Math.floor(fromHz / binHz));
  const end = Math.min(data.length - 1, Math.ceil(toHz / binHz));
  if (end <= start) {
    return 0;
  }
  let sum = 0;
  for (let i = start; i <= end; i += 1) {
    sum += data[i] / 255;
  }
  return sum / (end - start + 1);
}

function timeRms(wave: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < wave.length; i += 1) {
    const centered = (wave[i] - 128) / 128;
    sum += centered * centered;
  }
  return Math.sqrt(sum / wave.length);
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
