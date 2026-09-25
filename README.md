# Qibla Line

Qibla Line is a mobile-first web app for finding the Qibla without trusting your phone's compass. Compasses drift indoors near steel, speakers, wiring and appliances. Qibla Line uses the walls of your building instead: you lay the phone flat with its top edge against a wall, turn a dial until the map lines up with that wall, then turn until the app says you're facing the Qibla.

Live app: <https://qiblaline.com>

Created by [Hash Milhan](https://hashir.net). The explainer film's source is at [hashmil/qibla-line-explainer](https://github.com/hashmil/qibla-line-explainer).

## How it works

1. **Place.** Use your location, pick one of 187 cities (each shows its Qibla bearing), or enter coordinates.
2. **Line up.** Lay the phone flat with its top edge against a wall. Turn the dial until the same wall on the map runs along the on-screen grid. The grid is fixed to the screen, so its lines stay parallel to the phone's edges while the map turns underneath.
3. **Face.** Tap "It lines up", pick the phone up and hold it flat. The app follows your turn with the gyroscope and guides you ("Turn left 12°") until it shows "Facing the Qibla" in amber.

The gyroscope measures how far the phone has turned relative to where it started. Unlike the magnetometer that drives the compass, it is not disturbed by magnets or steel. If motion access is refused or unavailable, the app falls back to a fixed reading: "The Qibla is 34° left of the phone's top edge", with the amber line on the map as the direction.

## Features

- Three-step flow: Place, Line up, Face
- Rotary dial and a screen-fixed alignment grid for lining the map up with a wall
- Gyroscope turn guidance after alignment, with a 2° "facing" threshold (4° to leave it, so it doesn't flicker)
- Optional compass button that makes the map follow the phone's heading, for outdoors or as a cross-check
- Zoom buttons, pinch zoom and recentre; pinching never zooms the whole page on iPhone
- Searchable local city list with each city's bearing; no external geocoding API
- Installable PWA: offers itself on first visit with per-device steps (iPhone, Android, Mac, Windows, in-app browsers), self-hosted fonts, a service worker that caches the app shell
- Dark night-use design; amber is used only for the Qibla (see `DESIGN.md`)
- Client-side only, no analytics, no backend

## Tech Stack

- Vite, React, TypeScript
- MapLibre GL JS with OpenStreetMap raster tiles, plus building outlines from OpenFreeMap vector tiles
- Fontsource (Chivo, Chivo Mono), lucide-react icons
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

Distance is calculated with the Haversine formula. The rendered map line uses spherical interpolation, not a simple two-point screen line. From Dubai city centre the result is 258.2° and 1,631 km.

The calculation, line interpolation and turn tracking live in:

- `src/lib/qibla.ts`
- `src/lib/geo.ts`
- `src/lib/gyro.ts`

## Run Locally

```bash
npm install
npm run dev
```

Then open the Vite URL printed by the command. Location works on `localhost`; on a phone over the local network it needs HTTPS.

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

## Deploy

Wrangler should already be authenticated on the deployment machine.

```bash
npx wrangler whoami
npm run deploy
```

`npm run deploy` builds the app, refuses to continue if tracked files have uncommitted changes, and uploads `dist` to the `qibla-line` Cloudflare Pages project on its production branch (`main`).

Domains:

- `qiblaline.com` is the production domain, a Pages custom domain with a proxied CNAME to `qibla-line.pages.dev`
- `www.qiblaline.com` redirects to `qiblaline.com` (301, zone redirect rule), so the installed app has one origin
- `qibla-line.pages.dev` still serves the same deployment

Preview a branch without touching production:

```bash
npm run build
npx wrangler pages deploy dist --project-name qibla-line --branch <name> --commit-dirty=true
```

That publishes to `https://<name>.qibla-line.pages.dev`.

`wrangler.jsonc` is intentionally kept as the Worker fallback configuration, so Wrangler may warn that the file is not being used for Pages. The Pages deploy script explicitly uploads `dist` and is the primary deployment path.

## Workers Fallback

The repository also includes a Worker static-assets fallback:

```bash
npm run deploy:workers
```

`wrangler.jsonc` serves `./dist` through the `ASSETS` binding and uses single-page app fallback handling.

## Privacy

Your location is used only on this device to calculate the Qibla line. It is not stored by this app. No analytics are included. Location is not sent to any custom backend; only map tile requests go to the tile providers (OpenStreetMap and OpenFreeMap). The only thing kept in browser storage is when you last dismissed the install prompt.

## Map Provider

The default map uses OpenStreetMap raster tiles through MapLibre GL JS:

```txt
https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

The tiles are inverted in the style itself for the dark design. On top, building outlines are drawn from OpenStreetMap vector tiles served free by OpenFreeMap (`https://tiles.openfreemap.org/planet`, no key), so the walls users line up against read clearly. Attribution for both is visible on the map. Both sources are configured in `src/lib/mapStyle.ts` so they can be swapped later. The app does not bulk download, prefetch or cache map tiles.

## Desktop Landing

Computers get a landing page (the explainer film, how it works, a QR code for qiblaline.com) instead of the app. Phones and tablets get the app exactly as before.

- An inline script at the top of `index.html` picks the mode before first paint. Computers are `(hover: hover) and (pointer: fine) and (min-width: 900px)`; iPads, which report themselves as Macs, are caught by touch support.
- `/about` shows the landing page on every device, so phones and Google's phone-width crawler can read it. The build writes `about.html` from the built `index.html` with its own canonical URL and title (`vite.config.ts`). On phones the QR codes give way to an "Open Qibla Line" button.
- `/app`, `?app` and any installed app (display-mode standalone and friends, or iOS `navigator.standalone`) always get the app. The manifest `start_url` is `/app`.
- `src/main.ts` is the only entry script. For the landing it runs `src/landing.ts` (video, Replay and sound buttons, section reveal); for the app it dynamic-imports `src/boot-app.tsx`, so the map and the app bundle never download for landing visitors.
- The service worker is registered only by the app. Because the app chunks are no longer named in `index.html`, the build writes `shell-assets.json` listing every script and stylesheet, and the worker precaches from it.
- The QR code is drawn at build time by a small Vite plugin (`vite.config.ts`, `qrcode` dev dependency).
- Landing assets live in `public/video/` (the film, 7 MB web encode, and its poster), `public/landing/` (three real app screens) and `public/og-card.jpg`. The film comes from the explainer project at `~/Dev/personal/qibla-line-explainer`; see `DESIGN.md`, "Desktop landing", for the page's design.

## Search, Sharing and AI Assistants

- `index.html` carries the title, description, canonical URL, Open Graph and Twitter tags, and JSON-LD structured data (WebSite, WebApplication, VideoObject with the film's transcript, FAQPage). The FAQ markup must match the visible Questions section word for word; change both together.
- `public/robots.txt` allows every crawler and points to `public/sitemap.xml`, which also lists the film.
- `public/llms.txt` is a plain markdown summary for AI assistants: what the app does, how, its limits, privacy, the film transcript and links.
- The manifest has a description, categories and the three app screens as install screenshots.
- Crawlers that don't run JavaScript see the landing page. Google renders `/` at phone width and so gets the app, with the landing content present but hidden, which is why `/about` exists: the same content, visible at every width, listed in the sitemap.

### Share card

`public/og-card.jpg` (1200x630) is rendered from `design/og-card.html`, which uses the app's fonts and the real Face screen. Render it with Playwright using the installed Chrome, then save as JPEG:

```bash
npx -y playwright screenshot --channel chrome --viewport-size=1200,630 "file://$PWD/design/og-card.html" og-card.png
magick og-card.png -quality 88 -sampling-factor 4:4:4 public/og-card.jpg
```

## Project Structure

```txt
index.html             mode picker, landing page markup, meta tags
src/
  main.ts              entry: landing page or dynamic import of the app
  landing.ts           landing page behaviour
  boot-app.tsx         app bootstrap and service worker registration
  App.tsx              step flow, geolocation, compass and gyroscope wiring
  components/          TopBar, PlacePanel, CitySearch, MapView, Dial,
                       MapButtons, FaceCard, InstallSheet
  data/cities.ts
  lib/                 qibla, geo, gyro, compass, install, mapStyle, format
  styles/global.css    app styles
  styles/landing.css   landing page styles
  types/
public/
  icons/
  landing/             app screens shown on the landing page
  video/               explainer film and poster
  og-card.jpg          1200x630 share card, from design/og-card.html
  llms.txt             summary for AI assistants
  robots.txt
  sitemap.xml
  manifest.webmanifest
  sw.js
DESIGN.md              colour and type tokens, and where each came from
prompt/
  qibla-line-prompt.md the original build prompt, kept for history
```

## Known Limitations

- Geolocation and motion sensors need HTTPS, except on localhost.
- Alignment is only as accurate as OpenStreetMap's drawing of your building. In well-mapped areas that is usually within a degree or two.
- The gyroscope drifts slowly. Over the time it takes to turn and pray this is well under a degree, but tap "Line up again" if you have moved around a lot.
- iPhone asks for motion access the first time you tap "It lines up". Refusing it leaves the fixed-angle fallback.
- Compass mode depends on browser and device support and is unreliable indoors, which is why it is optional.
- OSM public tiles are suitable for light use. A dedicated tile provider is recommended for heavier public traffic.
- MapLibre is a substantial dependency, so the production bundle has an expected large-chunk warning.
