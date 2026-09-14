# Architecture

Halloween Puppet is an npm workspaces monorepo. Live motion never leaves the local network as video: the sensor runs MediaPipe in the browser and only sends landmarks.

```
┌─────────────┐  same origin            ┌──────────────────────────┐
│ Browser     │  /  /api  /socket.io    │ One HTTPS process :3000  │
│ Sensor/     │ ─────────────────────► │ Express + Socket.IO      │
│ Stage/…     │ ◄──── session state ── │ Vue: Vite or client/dist │
└─────────────┘                         └──────────────────────────┘
```

## Packages

| Package | Path | Role |
| --- | --- | --- |
| `@halloweenpuppet/shared` | `shared/` | Session IDs, tracking protocol, figure and animation enums |
| `@halloweenpuppet/server` | `server/` | HTTPS host: session registry, Socket.IO, Vue app |
| `@halloweenpuppet/client` | `client/` | Vue 3 UI, MediaPipe, Three.js / VRM, music and recording |

`npm run dev` starts **one** process on `https://localhost:3000`. Express handles `/api` and Socket.IO; Vite runs as middleware for the Vue app (HMR included). `npm start` after a build serves `client/dist` from that same process. The browser never needs a second origin: `io()` and `fetch('/api/…')` use the page host.

`npm run dev:split` is the old two-process setup (API-only server + Vite on 5173).

## Routes

| Path | Screen |
| --- | --- |
| `/` | Home: session code, links, phone QR/URL |
| `/sensor/:sessionId` | Camera + MediaPipe (body or face) |
| `/stage/:sessionId` | Wide 3D stage, VRM, Halloween figures, music controls |
| `/music/:sessionId` | 9:16 “phone” viewport for recording |
| `/dance/:sessionId` | 9:16 dance stage, solo or duo avatars |
| `/halloween/:sessionId` | Themed stage: moon, mist, pumpkins, exaggeration presets |

## Tracking protocol

A `TrackingFrame` (see `shared/src/protocol.ts`) can carry:

- `pose` — MediaPipe pose landmarks (body)
- `face` — face landmarks and optional transform
- `blendShapes` — ARKit-style scores (`jawOpen`, blinks, smile, …)
- `glasses` — heuristic glasses presence
- `mode` — `body` or `face`

The server does not interpret landmarks. It stamps `clientId` and emits the frame to the other sockets in the same session.

Session-wide settings (`halloweenFigure`, `halloweenFigureB`, `loopAnimation`, `danceCast`, `exaggerationPreset`) go over `session-settings` so every stage stays in sync.

`MotionExaggeration` scales mapped arm/head rotations and face drive (mouth, eyes, brows) after mapping and before smoothing. Outputs are clamped.

Duo tracking assigns a stable `personId` (1 or 2) with nearest-neighbour matching on torso/face center so avatars do not swap when people cross.

## Client pipeline

1. **Sensor** — `MediaPipeTracker` reads the webcam, draws a 2D overlay, and sends frames through `SocketIoTrackingTransport`.
2. **Stage / Music** — `useLiveStage` receives frames and drives `StageScene`.
3. **Body** — `SkeletonMapper` → `MotionSmoothing` → `HumanoidSkeleton` and VRM humanoid bones.
4. **Face** — `FaceMapper` → Halloween figure (`HalloweenFace`) plus VRM expressions when present.
5. **Mouth** — face blendshapes (and loop animations) drive the Halloween jaw. Music is not analysed for visemes.
6. **Record** — `StageRecorder` captures the WebGL canvas (9:16 on the music page) plus the music graph into WebM.

## Audio graph

`MusicPlayer` builds the Web Audio graph on the first user gesture (Play or 3-2-1 GO):

```
<audio> → MediaElementSource → Gain → speakers
                                ↘ MediaStreamDestination (recording)
```

Creating the `AudioContext` only after a countdown would often get blocked by the browser autoplay policy.

## Privacy

| Data | Where it goes |
| --- | --- |
| Camera pixels | Stay in the sensor tab |
| Landmarks / blendshapes | Local Socket.IO session |
| Music file | Played in the stage/music tab |
| Recording | Downloaded as WebM in that same browser |

There is no account system and no cloud media store.
