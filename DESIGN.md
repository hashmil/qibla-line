# Qibla Line design

## Overview

A night-use instrument for finding the Qibla at home. The artefact is a sighting instrument: a map you turn with a dial until it matches the room, then a line you face along. Three steps in a fixed order: Place, Match, Face.

Idiom: dark instrument panel. Chosen by Hash on 2026-09-25 from four mockups (the dial from "Site plan", the look from "Night tape"). Dark is the brand, not a theme toggle: the app is mostly used for Fajr and Isha in dim rooms.

## Colors

Amber means "the Qibla" and nothing else. Every other element stays neutral.

| Token | Hex | Use | Source |
|---|---|---|---|
| `--night` | `#07090c` | page, bars | near-black that reads as black on OLED without crushing the map |
| `--panel` | `#12161c` | cards, dial face, buttons | one step up from night so surfaces separate without shadows |
| `--rule` | `#2a3038` | borders, dividers, dial rings | |
| `--text` | `#d8d2c4` | primary text, dial index | warm off-white, easier than pure white in the dark |
| `--dim` | `#7c7f84` | secondary text, ticks | |
| `--amber` | `#ffb23e` | Qibla line, Kaaba mark, current step, primary action, "facing" state | low-blue warm light, the colour used for night instrument lighting |
| `--on-amber` | `#1a1204` | text on amber | |
| `--grid` | `--text` at 30% | alignment grid lines | quiet enough to sit over the map, clear enough to judge parallel |

Map tiles: OSM raster inverted in the style itself (`raster-brightness-min` 0.62 above `raster-brightness-max` 0.02, saturation -0.85, contrast 0.3 so building outlines stay readable), so the map sits in the same dark range as the chrome.

## Typography

Chivo for text, Chivo Mono for numbers only (bearings, degrees, distances). Same family, so the two sit together.

Steps, ratio about 1.25: 12, 14, 16, 20, 25. Weights 400 and 700 for Chivo, 500 for Chivo Mono. Inputs are 16px so iOS does not zoom on focus.

## Layout

Full-screen map. Top bar is solid (no text over map tiles). Bottom holds the step's control: the dial in Match, a card in Face. Map padding matches the bars so the user's dot sits in the middle of the visible map. 16px side margin; spacing 4, 8, 12, 16, 24.

## Elevation

No shadows. Surfaces separate by colour (night, panel) and a 1px rule.

## Shapes

Radius 12px on buttons and cards: large touch targets used half-asleep, soft enough to read as buttons. The dial is a circle. Step bars are square-ended 3px rules.

## Components

- Top bar: app name, place button, step bars, title, one line of help
- Place panel: use-my-location, city search with each city's bearing, manual coordinates
- Dial: 360° ring with N/E/S/W, 30° labels, 5° ticks, amber Kaaba mark; drag turns the map
- Alignment grid: 48px squares fixed to the screen from the top bar to the bottom edge (showing either side of the dial), one line through the user's dot; faint at rest, full while the map turns
- Map buttons: zoom in, zoom out, recentre, compass
- Face card: live turn guidance from the gyroscope ("Turn right 12°", then "Facing the Qibla" in amber; one-line headline and two-line help so the card never changes height), static angle from the phone's top edge when motion isn't available, place and distance, Line up again, Change place
- Straight-ahead mark: small triangle at the top of the map while guidance is live

## Desktop landing

Computers get a landing page instead of the app (see README, "Desktop landing"). Phones and tablets never see it.

Artefact: a product page for one instrument, in the manner of a hardware maker's launch page. Idiom: marquee hero, then the product shown at length (specimen): the film, the three real screens in order, the reason it works, then the way to get it. Chosen by Hash on 2026-09-25 ("like an award winning product that apple would make").

Tokens are the app's, unchanged. Amber still means the Qibla only: on this page it appears in the film, in the real app screens, and in "Facing the Qibla". Nothing else on the page is amber.

Type continues the app's 1.25 scale upwards for display sizes: 12, 14, 16, 20, 25, 31, 39, 49, 61, 76, 95, 119. The Dubai bearing figure 119, hero headline 76, section headlines 49, step names 25, lead text 20, body 16. Chivo 700 for headlines with tight leading (1.05), Chivo Mono 500 for numbers and the web address. One exception: the 119px bearing figure is Chivo 700 with tabular figures, because at that size the mono's full-width point and degree sign open visible gaps.

Layout: centred column, 1200px maximum, 32px side margin. Sections separated by space (128px), not rules. The three screens sit in one row because the steps happen in that order.

Screens are the real 1170x2532 captures from the explainer project, shown bare with the iPhone display's own corner radius (36px at 320px wide) and a 1px rule. No drawn device.

QR code: dark modules on ink, on a 12px-radius plate, generated at build time.

Motion: sections rise 16px and fade in once as they enter the viewport; off with reduced motion.

Phones see this page on their first visit and at /about. Below 900px it becomes one column: headline 39, section headlines 31, body 16, 16px side margin, screens 260px wide with the display radius scaled to match (29px). The QR codes give way to a bar fixed to the bottom of the screen: an amber "Open Qibla Line" button, the page's one primary action as in the app, and a panel-coloured "Add to Home Screen".
