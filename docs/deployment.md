# Deployment

SkyCeil is a full-stack Node.js app with WebSockets, so deploy it as a Node web service rather than a static site.

## Recommended resume demo: Render

This repository includes `render.yaml` for Render Blueprint deployment.

1. Push the repository to GitHub.
2. In Render, choose **New > Blueprint**.
3. Select the GitHub repository.
4. Render will use:
   - build command: `npm install && npm run build`
   - start command: `SKYCEIL_PORT=$PORT npm run start --workspace @skyceil/server`
   - health check: `/health`
5. The default demo provider is `mock`, so the portfolio demo always has aircraft-like traffic even without API keys.

## Vercel

SkyCeil also includes a Vercel adapter:

- `vercel.json` builds the Vite frontend from `apps/web`.
- `api/server.ts` exposes the Express + Socket.IO backend as a Vercel Function.
- `vercel.json` rewrites `/api/*` requests into that function.
- The Vercel build env points the frontend to same-origin `/api/*`.
- The deployed demo uses `SKYCEIL_PROVIDER=mock` by default.

Deploy from the Vercel dashboard:

1. Import `manaspanika12/SkyCeil`.
2. Keep the root directory as the repository root.
3. Keep the detected build settings from `vercel.json`.
4. Make sure Fluid Compute is enabled if your project settings ask for it, because Vercel WebSockets require it.
5. Deploy.

The frontend also falls back to REST polling if Socket.IO cannot connect. This keeps the Vercel resume demo usable even when preview deployment protection or WebSocket beta settings block realtime connections. Render, Fly.io, Railway, or Docker are still better fits for a continuously running room installation because calibration persistence and polling live in an always-on Node process there.

## Live OpenSky mode

Set these environment variables in the deployment dashboard:

```env
SKYCEIL_PROVIDER=opensky
SKYCEIL_USER_LAT=37.7749
SKYCEIL_USER_LON=-122.4194
SKYCEIL_RADIUS_KM=200
OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=
```

Visitors can also open the location panel in the app and use browser geolocation or manual coordinates to retarget the runtime observer location.

## Docker

```bash
docker build -t skyceil .
docker run -p 4100:4100 -e SKYCEIL_PROVIDER=mock skyceil
```

Open `http://localhost:4100`.
