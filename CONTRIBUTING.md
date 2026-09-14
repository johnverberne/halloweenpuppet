# Contributing

Thanks for looking at Halloween Puppet. The project is a browser prototype: keep changes small and easy to try locally.

## Setup

```bash
npm install
npm run dev
```

Open `https://localhost:5173`, accept the self-signed certificate, then use one session on both **sensor** and **stage**.

## Checks before a pull request

```bash
npm run typecheck
npm run build
```

## Guidelines

- Camera frames stay on the device. Do not add code that uploads video or audio of the performer to the server.
- Shared types live in `shared/`. Change the protocol there first, then server and client.
- Prefer the existing Socket.IO events over new REST endpoints for live tracking.
- The UI is Dutch. Keep user-facing copy in Dutch unless a screen is explicitly bilingual.
- Do not commit `.mp3`, `.wav`, `.webm`, `.env`, or `.vrm` files.

## Suggested test pass

1. Sensor camera starts and the 2D overlay tracks a person.
2. Stage follows the same session for body and face mode.
3. Music page plays a local track and the Halloween mouth moves.
4. Phone connect URL loads over HTTPS on the LAN (if you have a second device).
