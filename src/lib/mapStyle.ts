import type { StyleSpecification } from "maplibre-gl";

export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
// OpenStreetMap vector tiles from OpenFreeMap (free, no key), used only for building outlines
export const BUILDINGS_TILEJSON = "https://tiles.openfreemap.org/planet";

export function createRasterStyle(tileUrl = OSM_TILE_URL): StyleSpecification {
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
      }
    ]
  };
}
