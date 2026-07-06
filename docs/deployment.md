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
