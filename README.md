# SkyCeil

SkyCeil is a production-minded full-stack airspace visualization app that turns a ceiling projector into a futuristic aircraft HUD. It streams aircraft data from a Node.js backend into a Three.js/WebGL frontend with glowing aircraft icons, trails, calibration controls, and realtime Socket.IO updates.

## Resume highlights

- Full-stack TypeScript monorepo with npm workspaces.
- Express + Socket.IO realtime backend.
- Provider architecture for OpenSky, mock traffic, and future ADS-B/local receiver feeds.
- Geospatial math package for Haversine distance, bearing, curvature-aware elevation, and projection mapping.
- Three.js renderer with object pooling, shader glow, trails, dead reckoning, and display modes.
- Runtime location panel with browser geolocation and manual lat/lon input.
- Projector calibration with four-corner homography solving.
- CI, Dockerfile, Render blueprint, Vercel adapter, tests, linting, typechecking, and docs.

## Screens

The first screen is the actual projector visualization, not a marketing page. Controls are layered as HUD panels around the WebGL sky surface.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open the Vite URL printed by the web app during development, usually `http://localhost:5173`.

For a production-style local run:

```bash
npm run build
SKYCEIL_PROVIDER=mock npm run start
```

Then open `http://localhost:4100`.

## Location support

SkyCeil can run from a default configured location, but the app also includes a location panel:

- Use browser geolocation.
- Enter latitude/longitude manually.
- Change the radius in kilometers.
- Trigger a fresh backend aircraft poll for the selected observer location.

This makes the deployed demo generic for different visitors while keeping the backend provider architecture intact.

## Live data modes

### Mock mode

```env
SKYCEIL_PROVIDER=mock
```

Best for demos and resumes because it always shows synthetic aircraft.

### OpenSky mode

```env
SKYCEIL_PROVIDER=opensky
SKYCEIL_USER_LAT=37.7749
SKYCEIL_USER_LON=-122.4194
SKYCEIL_RADIUS_KM=200
OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=
```

OpenSky can run anonymously or with optional credentials, subject to OpenSky availability and rate limits.

## Project layout

```text
apps/server        Express, Socket.IO, provider polling, config, calibration APIs
apps/web           Vite React UI, Three.js projector surface, HUD controls
packages/shared    Types, socket contracts, config schemas
packages/geo       Haversine, bearing, elevation, projection, homography
packages/renderer-core  Three.js renderer, trails, pooling, motion prediction
config             Default runtime configuration
docs               Setup, providers, calibration, deployment, roadmap
```

## Validation

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Deployment

Use the included `render.yaml` for a Render Blueprint deployment, the Vercel adapter for a hosted portfolio demo, or the Dockerfile for any Node-capable host.

See [docs/deployment.md](docs/deployment.md).
