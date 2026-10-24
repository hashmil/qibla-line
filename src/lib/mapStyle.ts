import type { StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, LineString } from "geojson";

export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
// OpenStreetMap vector tiles from OpenFreeMap (free, no key), used only for building outlines
export const BUILDINGS_TILEJSON = "https://tiles.openfreemap.org/planet";
export const QIBLA_LINE_SOURCE = "qibla-line";
const AMBER = "#ffb23e";

const EMPTY_LINE: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] };

// The Qibla line is part of the style, so it draws as soon as the style is read rather
// than after every tile has loaded (which on a poor connection could be never).
export function createRasterStyle(
  qiblaLine: FeatureCollection<LineString> = EMPTY_LINE,
  tileUrl = OSM_TILE_URL
): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: [tileUrl],
        tileSize: 256,
        maxzoom: 19,
        attribution: OSM_ATTRIBUTION
      },
      buildings: {
        type: "vector",
        url: BUILDINGS_TILEJSON
      },
      [QIBLA_LINE_SOURCE]: {
        type: "geojson",
        data: qiblaLine
      }
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm",
        // Inverted: brightness-min above brightness-max flips light tiles to dark
        paint: {
          "raster-saturation": -0.85,
          "raster-contrast": 0.3,
          "raster-brightness-min": 0.62,
          "raster-brightness-max": 0.02
        }
      },
      {
        // Crisp outlines over the raster's faint building fills: these are the walls users line up against
        id: "building-outline",
        type: "line",
        source: "buildings",
        "source-layer": "building",
        minzoom: 14,
        paint: {
          "line-color": "#d8d2c4",
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.35, 16, 0.7],
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.5, 17, 1.25, 19, 2]
        }
      },
      {
        id: "qibla-line-glow",
        type: "line",
        source: QIBLA_LINE_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": AMBER,
          "line-opacity": 0.25,
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 8, 12, 14, 18, 20],
          "line-blur": 6
        }
      },
      {
        id: "qibla-line-core",
        type: "line",
        source: QIBLA_LINE_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": AMBER,
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 2.4, 12, 3.6, 18, 5]
        }
      }
    ]
  };
}
