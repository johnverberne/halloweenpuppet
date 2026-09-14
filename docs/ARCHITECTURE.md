# Architecture

Halloween Puppet is an npm workspaces monorepo. Live motion never leaves the local network as video: the sensor runs MediaPipe in the browser and only sends landmarks.

```
┌─────────────┐  landmarks + settings   ┌──────────────┐  broadcast   ┌─────────────┐
│ Sensor tab  │ ─────────────────────► │ Express +    │ ───────────► │ Stage /     │
│ MediaPipe   │                        │ Socket.IO    │              │ Music tab   │
│ webcam      │ ◄──── session state ── │ :3000        │              │ Three.js    │
└─────────────┘                        └──────────────┘              └─────────────┘
```

## Packages

| Package | Path | Role |
| --- | --- | --- |
| `@halloweenpuppet/shared` | `shared/` | Session IDs, tracking protocol, figure and animation enums |
| `@halloweenpuppet/server` | `server/` | Session registry, Socket.IO relay, health/connect APIs |
| `@halloweenpuppet/client` | `client/` | Vue 3 UI, MediaPipe, Three.js / VRM, music and recording |

During `npm run dev`, Vite (`https://localhost:5173`) proxies `/api` and `/socket.io` to the server. After `npm run build`, Express serves `client/dist` from port 3000.

## Routes

| Path | Screen |
| --- | --- |
| `/` | Home: session code, links, phone QR/URL |
| `/sensor/:sessionId` | Camera + MediaPipe (body or face) |
| `/stage/:sessionId` | Wide 3D stage, VRM, Halloween figures, music controls |
| `/music/:sessionId` | 9:16 “phone” viewport for recording |

## Tracking protocol

A `TrackingFrame` (see `shared/src/protocol.ts`) can carry:

- `pose` — MediaPipe pose landmarks (body)
- `face` — face landmarks and optional transform
- `blendShapes` — ARKit-style scores (`jawOpen`, blinks, smile, …)
- `glasses` — heuristic glasses presence
- `mode` — `body` or `face`

The server does not interpret landmarks. It stamps `clientId` and emits the frame to the other sockets in the same session.

Session-wide settings (`halloweenFigure`, `loopAnimation`) go over `session-settings` so every stage stays in sync.

## Client pipeline

1. **Sensor** — `MediaPipeTracker` reads the webcam, draws a 2D overlay, and sends frames through `SocketIoTrackingTransport`.
2. **Stage / Music** — `useLiveStage` receives frames and drives `StageScene`.
3. **Body** — `SkeletonMapper` → `MotionSmoothing` → `HumanoidSkeleton` and VRM humanoid bones.
4. **Face** — `FaceMapper` → Halloween figure (`HalloweenFace`) plus VRM expressions when present.
5. **Lipsync** — `FaceTrackingLipSyncProvider` and/or `AudioVisemeLipSyncProvider` (FFT/RMS → aa / ee / ih / oh / ou).
6. **Record** — `StageRecorder` captures the WebGL canvas (9:16 on the music page) plus the music graph into WebM.

## Audio graph

`MusicPlayer` builds the Web Audio graph on the first user gesture (Play or 3-2-1 GO):

```
<audio> → MediaElementSource → Analyser → Gain → speakers
                                         ↘ MediaStreamDestination (recording)
```

The analyser must stay in series. Creating the `AudioContext` only after a countdown would often get blocked by the browser autoplay policy.

## Privacy

| Data | Where it goes |
| --- | --- |
| Camera pixels | Stay in the sensor tab |
| Landmarks / blendshapes | Local Socket.IO session |
| Music file | Played in the stage/music tab |
| Recording | Downloaded as WebM in that same browser |

There is no account system and no cloud media store.
