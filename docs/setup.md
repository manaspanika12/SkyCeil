# Setup

## Requirements

- Node.js 20.11 or newer
- npm 10 or newer
- A Chromium-class browser with WebGL2 support
- A projector connected to the local-room machine

## Environment

Copy `.env.example` to `.env` and set the observer location:

```bash
SKYCEIL_USER_LAT=37.7749
SKYCEIL_USER_LON=-122.4194
SKYCEIL_RADIUS_KM=200
SKYCEIL_PROVIDER=opensky
```

For offline development:

```bash
SKYCEIL_PROVIDER=mock
```

## Development

```bash
npm install
npm run dev
```

The backend listens on `http://localhost:4100`. The frontend listens on a Vite port, normally `http://localhost:5173`, and proxies REST and Socket.IO calls to the backend.

## Production local-room run

```bash
npm run build
npm run start --workspace @skyceil/server
```

After the web app is built, the server serves `apps/web/dist` directly. Point the projector browser at `http://localhost:4100`.
