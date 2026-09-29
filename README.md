# WebRTC SFU Simulcast Sandbox

A small local demo of video publishing and subscribing through a mediasoup SFU. The project has two parts: a Node.js signaling/media server and a Vite browser client.

## Requirements

- Node.js and npm
- A browser with WebRTC support
- Camera access for publishing video

mediasoup uses a native worker, so installation also depends on having a compatible environment for the mediasoup version in this project.

## Install

From the repository root, install the server dependencies:

```sh
npm install
```

Install the client dependencies separately:

```sh
cd mediasoup-sandbox-client
npm install
```

## Run locally

Start the SFU server from the repository root:

```sh
node server.js
```

In a second terminal, start the browser client:

```sh
cd mediasoup-sandbox-client
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Keep both processes running. The client connects to the signaling server at `http://localhost:3000`.

In the page, select **Publish** and allow camera access, then select **Subscribe**. Once subscribed, use the layer buttons to request a low, middle, or high simulcast layer. The server listens for mediasoup media traffic on UDP ports `20000-20100`.

## Project layout

```text
.
├── server.js                    # Express, Socket.IO signaling, and mediasoup worker/router
├── package.json                 # Server dependencies and scripts
├── mediasoup-sandbox-client/
│   ├── index.html                # Demo controls and video elements
│   ├── package.json              # Vite and browser-side dependencies
│   └── src/main.js               # Publish, subscribe, and layer-selection flow
└── Sample run/                   # Captured screenshots from demo runs
```

## What it demonstrates

- A mediasoup worker and router configured for VP8 video.
- WebRTC send and receive transports exchanged over Socket.IO.
- Browser-side video publishing with three simulcast encodings.
- A consumer requesting a preferred spatial layer.

## Current scope and limitations

- This is a local sandbox, not a production SFU service. The server stores one producer, consumer, and each transport in process-wide variables; it does not implement rooms, per-client ownership, or multi-publisher isolation.
- The server binds WebRTC transports to `127.0.0.1` with no announced public IP. The setup is intended for local testing and is not configured for clients across the internet or typical NAT deployments.
- The browser client is served by Vite. The Express static directory in `server.js` is not the client app, so use the two-process workflow above.
- The root `npm test` script is a placeholder and exits with an error; no automated test suite is configured.

## Troubleshooting

- **Camera access is denied:** allow camera permission for the local Vite page. Browsers generally permit camera access on `localhost`.
- **The client cannot connect:** confirm the server is running on port `3000` and that the client is using `http://localhost:3000`.
- **No media arrives:** ensure UDP ports `20000-20100` are available locally and publish before subscribing.
- **mediasoup fails to install or start:** check the mediasoup installation requirements for your operating system and Node.js version.