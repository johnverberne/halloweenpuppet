export type VisemeName = 'aa' | 'ee' | 'ih' | 'oh' | 'ou' | 'sil';

export interface LipSyncFrame {
  timestamp: number;
  mouthOpen: number;
  viseme?: VisemeName;
  visemes?: Partial<Record<Exclude<VisemeName, 'sil'>, number>>;
}

export interface LipSyncProvider {
  update(timestamp: number): LipSyncFrame;
}
