# Qibla Line Implementation Prompt

```text
You are Codex acting as a senior product engineer, mobile web specialist, creative technologist and award-winning UI designer.

Build and deploy a beautiful mobile-first web app for iPhone called “Qibla Line”. The app helps me find the Qibla from my current location by showing a map with a precise Qibla line from my location to the Kaaba. The key interaction is that I can manually rotate the map with my fingers, or with on-screen controls, so I can visually align the map/building/roads with my actual house and then use the Qibla line as the direction reference.

Assume Wrangler is already authenticated on this machine. Do not ask me to log in unless Wrangler itself fails.

Core outcome:
A polished, production-ready, static web app deployed to Cloudflare for free, ideally Cloudflare Pages using a free pages.dev URL. If Pages deployment is not practical, deploy as a Cloudflare Worker with static assets and a free workers.dev URL.

Use British English in all UI copy.

IMPORTANT PRODUCT PRINCIPLE
The app should be map-first, not compass-first.

The manual map alignment is the main reliable mode:
1. Get my location or let me choose a city.
2. Show my position on the map.
3. Draw the Qibla line from my position to the Kaaba.
4. Let me rotate the map manually using two-finger rotation and on-screen controls.
5. I can align the map visually with my building/roads/walls, then read the Qibla line.

Device compass access is optional and should be a toggle, because indoor compass readings can be unreliable.

TECH STACK
Use:
- Vite
- React
- TypeScript
- MapLibre GL JS for the map, because it supports map bearing/rotation properly.
- OpenStreetMap raster tiles as the default free map source.
- No paid APIs.
- No Mapbox token.
- No backend unless Cloudflare Worker fallback is needed only to serve static assets.
- Client-side only calculations.
- Vitest for unit tests.
- CSS modules or plain CSS with CSS custom properties.
- Avoid Tailwind unless it materially speeds up implementation.
- Use lightweight dependencies only.

MAP PROVIDER
Use OpenStreetMap raster tiles through MapLibre using this style approach:

- source type: raster
- tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]
- tileSize: 256
- maxzoom: 19
- attribution visible: "© OpenStreetMap contributors"

Follow OSM tile usage constraints:
- Do not bulk download.
- Do not prefetch tiles.
- Do not add custom aggressive tile caching.
- Keep attribution visible.
- Make the tile URL configurable in one file so I can swap provider later.

KAABA CONSTANT
Use the Kaaba coordinates:
latitude: 21.422487
longitude: 39.826206

QIBLA CALCULATION
Implement this in a clean utility file, for example src/lib/qibla.ts.

Use the great-circle initial bearing formula:

Given:
φ1 = user latitude in radians
λ1 = user longitude in radians
φ2 = Kaaba latitude in radians
λ2 = Kaaba longitude in radians
Δλ = λ2 - λ1

y = sin(Δλ) * cos(φ2)
x = cos(φ1) * sin(φ2) - sin(φ1) * cos(φ2) * cos(Δλ)
θ = atan2(y, x)
bearing = (degrees(θ) + 360) % 360

Also calculate distance using the Haversine formula.

Add unit tests:
- Dubai city centre 25.2048, 55.2708 should give approx 258.2° true bearing to the Kaaba.
- Abu Dhabi 24.4539, 54.3773 should give approx 260.2°.
- London 51.5074, -0.1278 should give approx 119.0°.
- Colombo 6.9271, 79.8612 should give approx 294.8°.
Use tolerance ±0.5°.

GEODESIC LINE ON MAP
Do not just draw a naive straight line between coordinates if it can be improved.

Create a helper that returns a GeoJSON LineString from user location to Kaaba using great-circle interpolation with around 96 to 128 points.

Suggested implementation:
- Convert start and end lat/lon to 3D unit vectors.
- Use spherical linear interpolation.
- Convert interpolated points back to lat/lon.
- Return coordinates as [lon, lat].
- Keep it robust for global city selections.

Render the Qibla line as a MapLibre GeoJSON source and line layer:
- Rounded ends.
- Premium luminous styling.
- Clear enough to read on mobile.
- Use a subtle pulse or glow if performant.
- Add Kaaba marker at the destination.
- Add user marker at the current/selected location.

LOCATION FEATURES
On first launch:
- Show a refined intro panel over the map.
- Primary CTA: “Use my location”.
- Secondary option: city search/dropdown.
- Explain briefly: “Your location is used only in this browser to calculate the Qibla line.”

Use browser geolocation:
- navigator.geolocation.getCurrentPosition
- enableHighAccuracy: true
- timeout: 10000
- maximumAge: 30000

Handle:
- permission denied
- timeout
- unavailable
- insecure context
- location unsupported

If location fails or permission is denied:
- fall back to Dubai as the default
- show a friendly message
- keep the city selector visible

CITY DROPDOWN
Implement a searchable city dropdown/typeahead:
- Include at least 150 major world cities.
- Prioritise UAE, GCC, MENA, South Asia, UK, Europe, North America and Asia-Pacific.
- Include Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain, Al Ain, Doha, Riyadh, Jeddah, Makkah, Madinah, Kuwait City, Manama, Muscat, Cairo, Alexandria, Amman, Beirut, Istanbul, Karachi, Lahore, Islamabad, Dhaka, Colombo, Kandy, Male, Delhi, Mumbai, Hyderabad, Chennai, Bangalore, Kuala Lumpur, Singapore, Jakarta, Bangkok, Tokyo, Seoul, Sydney, Melbourne, London, Manchester, Birmingham, Paris, Berlin, Amsterdam, Madrid, Rome, New York, Toronto, Los Angeles, Chicago, Houston, Cape Town, Johannesburg and other major cities.
- Store city data locally in src/data/cities.ts.
- Each item: city, country, lat, lon, optional region.
- No external geocoding API.
- Add manual coordinate entry as an advanced option.

MAP ROTATION / ALIGNMENT INTERACTION
This is the most important UX.

MapLibre should allow:
- two-finger rotation on touch devices
- drag rotate if desktop
- pinch zoom
- normal pan/zoom

Create visible rotation controls:
- Rotate left 1°
- Rotate right 1°
- Rotate left 5°
- Rotate right 5°
- Reset North Up
- Qibla Up, which rotates the map so the Qibla bearing points straight up the screen
- Re-centre on my location

Show live values:
- Qibla bearing: e.g. “258.2° true”
- Distance to Kaaba: e.g. “1,631 km”
- Map rotation: e.g. “34°”
- Qibla relative to screen top: computed based on map bearing

Add a simple instruction line:
“Rotate the map until roads or your building match real life. The gold line shows the Qibla.”

DEVICE COMPASS OPTIONAL MODE
Add a toggle button: “Compass mode”.

This is a nice-to-have, not the default.

When enabled:
- Request device orientation permission only after a user tap.
- On iOS/Safari, use DeviceOrientationEvent.requestPermission(true) where available.
- Use webkitCompassHeading if available.
- Otherwise fall back carefully to deviceorientation / deviceorientationabsolute where supported.
- Display heading and accuracy if available.
- Show a warning: “Compass readings can drift indoors. Use map alignment for final confirmation.”
- Allow compass mode to be switched off.
- Do not break the app if compass APIs are unavailable.

If compass mode is active:
- Show a simple phone-heading indicator.
- Show “Turn phone X° clockwise/counter-clockwise” towards the Qibla if heading data is available.
- Keep the manual map controls available.

UX / VISUAL DESIGN DIRECTION
Make it feel like an award-worthy, calm, premium spatial tool.

Design language:
- Dark, refined, atmospheric base.
- Warm gold/sand Qibla line.
- Soft glass panels.
- Crisp typography.
- Large tactile controls.
- iPhone safe-area aware.
- No clutter.
- No generic dashboard look.
- No cheesy Islamic ornament overload.
- Subtle geometry is okay, but keep it modern and functional.

Think:
- Awwwards/FWA quality
- premium location utility
- spiritual precision meets spatial design
- polished micro-interactions
- refined loading states
- beautiful empty/error states

Layout:
- Fullscreen map.
- Floating top status pill.
- Bottom sheet for controls.
- Bottom sheet should be draggable or at least have compact/expanded states.
- Thumb-friendly controls.
- Works beautifully on iPhone Safari sizes:
  - 390 x 844
  - 393 x 852
  - 430 x 932
- Also works on desktop.

Use:
- CSS custom properties
- responsive clamp() sizing
- env(safe-area-inset-top/bottom)
- prefers-reduced-motion support
- accessible contrast
- visible focus states
- ARIA labels for controls

COPY TONE
Use concise, human copy:
- “Use my location”
- “Choose a city”
- “Qibla bearing”
- “Map rotation”
- “Qibla up”
- “North up”
- “Compass mode”
- “Compass readings can drift indoors. Use map alignment for final confirmation.”

PRIVACY
Add a small privacy note:
- “Your location is used only on this device to calculate the Qibla line. It is not stored by this app.”

Do not add analytics.
Do not send location to any custom backend.
Only map tile requests go to the tile provider.

PWA / IPHONE WEB APP
Make it usable as an iPhone home-screen web app:
- Add manifest.webmanifest.
- Add app icons, can be generated SVG/PNG assets.
- Add apple-mobile-web-app-capable meta tags.
- Add theme-colour.
- Add proper viewport meta with viewport-fit=cover.
- App shell should feel native.
- Optional service worker for app shell only.
- Do not cache OSM tiles aggressively in the service worker.

PROJECT STRUCTURE
Create a clean structure similar to:

src/
  App.tsx
  main.tsx
  styles/
    global.css
  components/
    MapView.tsx
    ControlSheet.tsx
    CitySearch.tsx
    CompassToggle.tsx
    StatusPill.tsx
    PermissionPanel.tsx
  data/
    cities.ts
  lib/
    qibla.ts
    geo.ts
    compass.ts
    format.ts
  types/
    index.ts
public/
  manifest.webmanifest
  icons/
README.md
wrangler.jsonc
package.json

CLOUDFLARE DEPLOYMENT
Primary deployment target: Cloudflare Pages Direct Upload with Wrangler.

Implement package scripts:
- dev
- build
- preview
- test
- deploy:pages
- deploy:workers
- deploy

Suggested scripts:
- "dev": "vite --host 0.0.0.0"
- "build": "tsc -b && vite build"
- "preview": "vite preview --host 0.0.0.0"
- "test": "vitest run"
- "deploy:pages": "npm run build && npx wrangler pages deploy dist --project-name qibla-line"
- "deploy:workers": "npm run build && npx wrangler deploy"
- "deploy": "npm run deploy:pages"

Before deployment:
- Run npm install.
- Run npm run test.
- Run npm run build.
- Run npx wrangler whoami to confirm authentication.
- Try npm run deploy.

If Pages project creation is required:
- Try npx wrangler pages project create qibla-line --production-branch=main
- If that flag is unsupported, use the interactive Wrangler command and accept sensible defaults.
- Do not ask me for Cloudflare credentials.

Workers fallback:
Create wrangler.jsonc for Workers static assets fallback:

{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "qibla-line",
  "compatibility_date": "2026-06-27",
  "main": "src/worker.ts",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS"
  }
}

Create src/worker.ts:

export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};

Use proper TypeScript typing if Wrangler types are available.

README
Write a useful README with:
- What the app does.
- How Qibla is calculated.
- Why map alignment is the primary mode.
- Why compass mode is optional.
- How to run locally.
- How to deploy to Cloudflare Pages.
- How to deploy to Cloudflare Workers fallback.
- Privacy note.
- Map provider note and OSM attribution/policy note.
- Known limitations.

QUALITY BAR
Do not stop at a functional prototype.
Make it feel finished.

Acceptance criteria:
1. App loads on iPhone Safari over HTTPS.
2. User can grant location access and see Qibla line.
3. User can deny location and still use city dropdown.
4. Dubai default works and shows Qibla bearing around 258.2° true.
5. Map rotates with touch gestures where supported.
6. On-screen rotation controls work.
7. “Qibla Up” rotates the map so the Qibla line points to the top of the screen.
8. “North Up” resets map bearing to 0.
9. Compass mode is optional and fails gracefully.
10. UI is premium, polished, responsive and accessible.
11. No paid APIs or API keys.
12. Unit tests pass.
13. Production build succeeds.
14. Deployed Cloudflare URL is printed at the end.

IMPLEMENTATION NOTES
- Use MapLibre map bearing as the source of truth for visual rotation.
- Keep qibla bearing as true-north bearing.
- Be careful with bearing sign conventions. Add tests or visual checks.
- Add comments around the bearing maths.
- Keep UI animation smooth but not heavy.
- Avoid huge bundles.
- Do not over-engineer.
- Make sensible decisions without asking me unless something blocks deployment.

FINAL OUTPUT FROM YOU
When finished, provide:
- Local run command.
- Test/build results.
- Cloudflare deployment URL.
- Any limitations or follow-up improvements.
```

