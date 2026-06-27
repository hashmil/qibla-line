import type { StyleSpecification } from "maplibre-gl";

export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

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
      }
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm",
        paint: {
          "raster-saturation": 0.08,
          "raster-contrast": 0.08,
          "raster-brightness-min": 0.03,
          "raster-brightness-max": 1
        }
      }
    ]
  };
}
