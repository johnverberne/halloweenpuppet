# Halloween Puppet

Browser-based Halloween motion-capture puppet. A phone or webcam tracks a person locally with MediaPipe. A second screen animates a 3D skeleton, a VRM avatar, or a Halloween face. Optional music playback and 9:16 WebM recording.

**The camera never leaves the device.** Only landmarks, blendshapes and session settings travel over Socket.IO.

The UI is Dutch.

[Architecture](docs/ARCHITECTURE.md) · [Contributing](CONTRIBUTING.md) · [License](LICENSE)

## Features

- **Body tracking** — MediaPipe Pose → Three.js humanoid + VRM bones
- **Face tracking** — blendshapes, head pose, eye blink, smile, glasses heuristic
- **Halloween figures** — pumpkin, skeleton, zombie, Frankenstein on `/halloween` with moon, mist and pumpkins
- **Exaggeration engine** — NORMAL / CARTOON / HALLOWEEN / EXTREME (clamped arm, head and mouth gain)
- **Dance / duo** — 9:16 `/dance` with one or two tracked people and stable person IDs
- **Phone as sensor** — HTTPS + LAN QR from the home page, larger touch targets on mobile
- **Latency / debug** — RTT, frame age, tracking/render FPS, persons and confidence on every screen
- **Music** — play a track with countdown; the mouth follows the face, not the audio
- **3-2-1 GO** — countdown, then playback (and optional recording)
- **Recording** — canvas + music to `.webm` (9:16 on the music page)

Open `/dance/<sessie>` for TikTok-style 9:16 with **Solo** or **Duo**. Set **Duo** on the sensor as well so MediaPipe tracks two people.

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

One process serves the Vue app, `/api` and Socket.IO over HTTPS.

1. Open [https://localhost:3000](https://localhost:3000). Accept the self-signed certificate warning.
2. Create a session (or use `HALLOWEEN-DEMO`).
3. Open **sensor**, choose **Hele lichaam** or **Gezicht**, click **Start camera**.
4. Open **stage** in another tab with the same session code.
5. Open **halloween** for the themed stage, or **muziek** / **dance** for 9:16 recording.

| Mode | Command | URL |
| --- | --- | --- |
| Dev (one server) | `npm run dev` | `https://localhost:3000` |
| Production | `npm start` | HTTP on `PORT` (builds `client/dist` if missing) |

Local HTTPS is for the camera. On a host (`NODE_ENV=production` / `npm start`) the process listens HTTP; TLS sits on the proxy. Set `HP_HTTPS=1` only if Node itself should terminate TLS.

## Music and recording

The demo filename is `client/public/tracks/in-de-zevenster-4.mp3`. That file is **not** in the repository (copyright). Drop your own mp3 there, or pick a file in the music panel.

1. Open `/music/HALLOWEEN-XXXX`.
2. Wait until the track duration appears, then click **Play** or **3-2-1 GO**.
3. The mouth follows the live face (or a loop animation), not the soundtrack.

Browsers only start audio after a click. The player arms the Web Audio graph on that click so countdown-then-play is not blocked.

## Phone as sensor

The camera API requires HTTPS.

1. PC and phone on the **same Wi-Fi** (not guest / mobile data).
2. On the home page, scan the QR or copy the LAN URL, for example `https://192.168.x.x:3000/sensor/HALLOWEEN-XXXX`.
3. On the phone, accept the certificate warning (**Advanced → Proceed**). Skipping that blocks both camera and Socket.IO.
4. Allow Node.js through the Windows firewall if LAN traffic is refused.

`http://` on a LAN IP will not get a camera. Android/Chrome is the easiest; iPhone/Safari is stricter with self-signed certs.

## Repository layout

```
halloweenpuppet/
├── shared/                 Protocol, session IDs, shared types
├── server/                 Express + Socket.IO + Vue (Vite middleware of dist)
├── client/                 Vue 3 + Three.js + MediaPipe (source)
│   ├── public/tracks/      Your local demo mp3 (gitignored)
│   └── src/
│       ├── tracking/       Camera, pose, face, glasses
│       ├── animation/      Skeleton, VRM, Halloween faces
│       ├── audio/          Music player + countdown
│       ├── recording/      WebM capture
│       └── views/          Home, sensor, stage, music, dance
└── docs/ARCHITECTURE.md
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm install` | Install all workspaces |
| `npm run dev` | One HTTPS server: Vue (Vite) + API + Socket.IO |
| `npm run build` | Production client + server typecheck |
| `npm start` | Build Vue if needed, then serve `client/dist` + API |
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
