export type ClientRole = 'sensor' | 'stage';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type TrackingMode = 'body' | 'face';

export type DanceCast = 'solo' | 'duo';

export type HalloweenFigureId = 'pumpkin' | 'skeleton' | 'zombie' | 'frankenstein';

export type LoopAnimationId = 'idle' | 'talk' | 'laugh' | 'nod' | 'wave';

export type ExaggerationPresetId = 'normal' | 'cartoon' | 'halloween' | 'extreme';

export const EXAGGERATION_PRESETS: ReadonlyArray<{
  id: ExaggerationPresetId;
  label: string;
  blurb: string;
}> = [
  { id: 'normal', label: 'Normaal', blurb: '1:1 beweging, geen extra punch' },
  { id: 'cartoon', label: 'Cartoon', blurb: 'Iets groter dan het leven' },
  { id: 'halloween', label: 'Halloween', blurb: 'Grijns, kaak en armen extra' },
  { id: 'extreme', label: 'Extreem', blurb: 'Maximale overdrijving, geklemd' },
];

export const LOOP_ANIMATIONS: ReadonlyArray<{
  id: LoopAnimationId;
  label: string;
  blurb: string;
  mode: TrackingMode;
}> = [
  { id: 'idle', label: 'Adem', blurb: 'Rustige adem en knipper', mode: 'face' },
  { id: 'talk', label: 'Praten', blurb: 'Mond in een blijvende loop', mode: 'face' },
  { id: 'laugh', label: 'Lachen', blurb: 'Grijns en schouders', mode: 'face' },
  { id: 'nod', label: 'Knikken', blurb: 'Ja-knik in een loop', mode: 'face' },
  { id: 'wave', label: 'Zwaaien', blurb: 'Zwaaiende arm', mode: 'body' },
];

export const HALLOWEEN_FIGURES: ReadonlyArray<{ id: HalloweenFigureId; label: string; blurb: string }> = [
  { id: 'pumpkin', label: 'Pompoenmonster', blurb: 'Gloeiende jack-o-lantern' },
  { id: 'skeleton', label: 'Skelet', blurb: 'Schedel met klapperende kaak' },
  { id: 'zombie', label: 'Zombie', blurb: 'Groen monster met steken' },
  { id: 'frankenstein', label: 'Frankenstein', blurb: 'High-res monster met bolts en litteken' },
];

export interface SessionSettings {
  halloweenFigure: HalloweenFigureId;
  halloweenFigureB: HalloweenFigureId;
  loopAnimation: LoopAnimationId | null;
  danceCast: DanceCast;
  exaggerationPreset: ExaggerationPresetId;
}

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  halloweenFigure: 'pumpkin',
  halloweenFigureB: 'skeleton',
  loopAnimation: null,
  danceCast: 'solo',
  exaggerationPreset: 'halloween',
};

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PosePayload {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
  confidence: number;
}

export interface FacePayload {
  landmarks: Landmark[];
  confidence: number;
  transformationMatrix?: number[];
}

export interface GlassesPayload {
  present: boolean;
  confidence: number;
}

export interface HandsPayload {
  left: Landmark[] | null;
  right: Landmark[] | null;
}

export interface BlendShapeScore {
  categoryName: string;
  score: number;
}

export interface TrackingFrame {
  type: 'tracking-frame';
  clientId: string;
  timestamp: number;
  personId: number;
  mode: TrackingMode;
  pose: PosePayload | null;
  face: FacePayload | null;
  hands: HandsPayload | null;
  blendShapes: BlendShapeScore[];
  glasses: GlassesPayload | null;
}

export interface JoinPayload {
  sessionId: string;
  role: ClientRole;
  name?: string;
}

export interface SessionClientInfo {
  socketId: string;
  role: ClientRole;
  name: string;
  joinedAt: number;
}

export interface SessionSnapshot {
  sessionId: string;
  clients: SessionClientInfo[];
  settings: SessionSettings;
}

export interface LatencyPing {
  clientTime: number;
}

export interface LatencyPong {
  clientTime: number;
  serverTime: number;
}

export const SOCKET_EVENTS = {
  join: 'join',
  leave: 'leave',
  trackingFrame: 'tracking-frame',
  sessionState: 'session-state',
  sessionSettings: 'session-settings',
  ping: 'latency-ping',
  pong: 'latency-pong',
} as const;
