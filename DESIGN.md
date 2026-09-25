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

Map tiles: OSM raster inverted in the style itself (`raster-brightness-min` 0.62 above `raster-brightness-max` 0.02, saturation -0.85), so the map sits in the same dark range as the chrome.

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
- Map buttons: zoom in, zoom out, recentre, compass
- Face card: angle statement, place and distance, Re-match, Change place
