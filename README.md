# Halloween Puppet

Browser-based Halloween motion-capture puppet. A phone or webcam tracks a person locally with MediaPipe. A second screen animates a 3D skeleton, a VRM avatar, or a Halloween face. Optional music drives visemes and records a 9:16 WebM.

**The camera never leaves the device.** Only landmarks, blendshapes and session settings travel over Socket.IO.

The UI is Dutch.

[Architecture](docs/ARCHITECTURE.md) · [Contributing](CONTRIBUTING.md) · [License](LICENSE)

## Features

- **Body tracking** — MediaPipe Pose → Three.js humanoid + VRM bones
- **Face tracking** — blendshapes, head pose, eye blink, smile, glasses heuristic
- **Halloween figures** — pumpkin, skeleton, zombie (and Frankenstein in the figure list)
- **Phone as sensor** — HTTPS + LAN URL / QR from the home page
- **Music + visemes** — FFT/RMS lipsync (`aa`, `ee`, `ih`, `oh`, `ou`), mixable with the face
- **3-2-1 GO** — countdown, then playback (and optional recording)
- **Recording** — canvas + music to `.webm` (9:16 on the music page)

Two-person capture and extra show-control features are not in this first public version.

## Requirements

- [Node.js](https://nodejs.org/) 20 or newer
- A webcam, or a phone on the same Wi-Fi
- Chrome or Edge work best (camera + Web Audio + WebM)

## Quick start

```bash
git clone https://github.com/johnverberne/halloweenpuppet.git
cd halloweenpuppet
npm install
npm run dev
```

1. Open [https://localhost:5173](https://localhost:5173). Vite uses a self-signed certificate — accept the warning.
2. Create a session (or use `HALLOWEEN-DEMO`).
3. Open **sensor**, choose **Hele lichaam** or **Gezicht**, click **Start camera**.
4. Open **stage** in another tab with the same session code.
5. Open **muziek** for the 9:16 recording view.

| Process | URL |
| --- | --- |
| Frontend (dev) | `https://localhost:5173` (or `5174` if 5173 is taken) |
| Backend (dev) | `http://localhost:3000` |
| Production | `http://localhost:3000` after `npm run build && npm start` |

Vite proxies `/api` and `/socket.io` to port 3000.

## Music and visemes

The demo filename is `client/public/tracks/in-de-zevenster-4.mp3`. That file is **not** in the repository (copyright). Drop your own mp3 there, or pick a file in the music panel.

1. Open `/music/HALLOWEEN-XXXX`.
2. Wait until the track duration appears, then click **Play** or **3-2-1 GO**.
3. Set **Lipsync** to **Muziek (audio-visemes)**.
4. The Halloween mouth should follow the music. The sidebar shows the current viseme and mouth value.

Browsers only start audio after a click. The player arms the Web Audio graph on that click so countdown-then-play is not blocked.

## Phone as sensor

The camera API requires HTTPS.

1. PC and phone on the **same Wi-Fi** (not guest / mobile data).
2. On the home page, copy the LAN URL, for example `https://192.168.x.x:5173/sensor/HALLOWEEN-XXXX`.
3. On the phone, accept the certificate warning (**Advanced → Proceed**). Skipping that blocks both camera and Socket.IO.
4. Allow Node.js / Vite through the Windows firewall if LAN traffic is refused.

`http://` on a LAN IP will not get a camera. Android/Chrome is the easiest; iPhone/Safari is stricter with self-signed certs.

## Repository layout

```
halloweenpuppet/
├── shared/                 Protocol, session IDs, shared types
├── server/                 Express + Socket.IO relay
├── client/                 Vue 3 + Vite + Three.js + MediaPipe
│   ├── public/tracks/      Your local demo mp3 (gitignored)
│   └── src/
│       ├── tracking/       Camera, pose, face, glasses
│       ├── animation/      Skeleton, VRM, Halloween faces
│       ├── audio/          Player + visemes
│       ├── recording/      WebM capture
│       └── views/          Home, sensor, stage, music
└── docs/ARCHITECTURE.md
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm install` | Install all workspaces |
| `npm run dev` | Server + Vite together |
| `npm run build` | Typecheck + production client |
| `npm start` | Serve the built client from Express |
| `npm run typecheck` | TypeScript for shared, server, and client |

## Privacy

| Data | Destination |
| --- | --- |
| Video | Stays in the sensor browser tab |
| Landmarks | Local Socket.IO session only |
| Recording | Downloaded in the stage/music browser |

No accounts, no uploaded tapes.

## Credits

- [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) — pose and face
- [Three.js](https://threejs.org/) and [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) — 3D and VRM
- [Vue 3](https://vuejs.org/), [Pinia](https://pinia.vuejs.org/), [Socket.IO](https://socket.io/)

Sample VRM (when loaded from the CDN) is the three-vrm constraint-twist example. Replace it with your own `.vrm` under `client/public/avatars/` if you want a custom puppet.

## License

[MIT](LICENSE) © 2026 John Verberne
