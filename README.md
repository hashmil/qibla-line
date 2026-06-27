# Qibla Line

Qibla Line is a mobile-first web app for finding the Qibla by aligning a real map with the physical world around you. It shows your current or selected position, draws a great-circle Qibla line to the Kaaba, and lets you rotate the map manually until roads, walls or buildings match what you can see.

Live app: <https://qibla-line.pages.dev>

## Features

- Map-first Qibla direction using MapLibre GL JS and OpenStreetMap raster tiles.
- Manual map rotation with touch gestures and optional on-screen fine controls.
- Qibla-up, north-up and re-centre controls.
- Browser geolocation with city and manual coordinate fallbacks.
- Searchable local city list with no external geocoding API.
- Optional compass mode with a map overlay; Qibla is the primary line and north is secondary.
- PWA manifest, iPhone home-screen metadata and app shell service worker.
- Client-side only calculations, with no analytics and no custom backend.

## Why Map Alignment Comes First

Indoor compass readings can drift, especially near metal, chargers, lifts and vehicles. Qibla Line treats the map as the primary reference: align the map visually, then read the gold line. Compass mode is optional and only requested after a tap.

## Tech Stack

- Vite
- React
- TypeScript
- MapLibre GL JS
- OpenStreetMap raster tiles
- Vitest
- Cloudflare Pages, with a Workers static-assets fallback

## Qibla Calculation

The app calculates the initial great-circle bearing from the selected location to the Kaaba at:

- Latitude: `21.422487`
- Longitude: `39.826206`

The bearing uses:

```txt
y = sin(delta lambda) * cos(phi2)
x = cos(phi1) * sin(phi2) - sin(phi1) * cos(phi2) * cos(delta lambda)
theta = atan2(y, x)
bearing = (degrees(theta) + 360) % 360
```

Distance is calculated with the Haversine formula. The rendered map line uses spherical interpolation, not a simple two-point screen line.

The calculation and line interpolation live in:

- `src/lib/qibla.ts`
- `src/lib/geo.ts`

## Run Locally

```bash
npm install
npm run dev
```

Then open the Vite URL printed by the command.

## Useful Scripts

```bash
npm run dev
npm run test
npm run build
npm run preview
npm run deploy:pages
npm run deploy:workers
npm run deploy
```

## Test and Build

```bash
npm run test
npm run build
```

## Deploy To Cloudflare Pages

Wrangler should already be authenticated on the deployment machine.

```bash
npx wrangler whoami
npm run deploy:pages
```

The Pages script builds the app and uploads `dist` to the `qibla-line` Pages project.

`wrangler.jsonc` is intentionally kept as the Worker fallback configuration, so Wrangler may warn that the file is not being used for Pages. The Pages deploy script explicitly uploads `dist` and is the primary deployment path.

## Workers Fallback

The repository also includes a Worker static-assets fallback:

```bash
npm run deploy:workers
```

`wrangler.jsonc` serves `./dist` through the `ASSETS` binding and uses single-page app fallback handling.

## Privacy

Your location is used only on this device to calculate the Qibla line. It is not stored by this app. No analytics are included. Location is not sent to any custom backend; only map tile requests go to the tile provider.

## Map Provider

The default map uses OpenStreetMap raster tiles through MapLibre GL JS:

```txt
https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

Attribution is visible in the map. The tile URL is configured in `src/lib/mapStyle.ts` so it can be swapped later. The app does not bulk download, prefetch or aggressively cache OSM tiles.

## Project Structure

```txt
src/
  App.tsx
  components/
  data/
  lib/
  styles/
  types/
public/
  icons/
  manifest.webmanifest
  sw.js
prompt/
  qibla-line-prompt.md
```

## Known Limitations

- Geolocation requires HTTPS, except on localhost.
- Compass mode depends on browser and device support, and may be approximate.
- OSM public tiles are suitable for light use. A dedicated tile provider is recommended for heavier public traffic.
- MapLibre is a substantial dependency, so the production bundle has an expected large-chunk warning.
