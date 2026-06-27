import maplibregl, { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { AppLocation } from "../types";
import { KAABA } from "../lib/qibla";
import { createQiblaLineCollection } from "../lib/geo";
import { createRasterStyle } from "../lib/mapStyle";

export type MapViewHandle = {
  rotateBy: (degrees: number) => void;
  followHeading: (heading: number) => void;
  setNorthUp: () => void;
  setQiblaUp: (bearing: number) => void;
  recentre: () => void;
};

type MapViewProps = {
  location: AppLocation;
  qiblaBearing: number;
  onBearingChange: (bearing: number) => void;
};

const LINE_SOURCE_ID = "qibla-line-source";

function createMarkerElement(className: string, label: string): HTMLElement {
  const element = document.createElement("div");
  element.className = className;
  element.setAttribute("aria-label", label);
  element.setAttribute("role", "img");
  return element;
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { location, qiblaBearing, onBearingChange },
  ref
) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const kaabaMarkerRef = useRef<Marker | null>(null);
  const loadedRef = useRef(false);
  const [mapError, setMapError] = useState("");

  useImperativeHandle(
    ref,
    () => ({
      rotateBy(degrees: number) {
        const map = mapRef.current;
        if (!map) return;
        map.easeTo({ bearing: map.getBearing() + degrees, duration: 180 });
      },
      followHeading(heading: number) {
        const map = mapRef.current;
        if (!map) return;
        map.easeTo({ bearing: heading, duration: 180, easing: (time) => time });
      },
      setNorthUp() {
        mapRef.current?.easeTo({ bearing: 0, duration: 260 });
      },
      setQiblaUp(bearing: number) {
        mapRef.current?.easeTo({ bearing, duration: 320 });
      },
      recentre() {
        mapRef.current?.easeTo({
          center: [location.lon, location.lat],
          zoom: location.source === "geolocation" ? 17 : 13,
          duration: 360
        });
      }
    }),
    [location]
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let map: MapLibreMap;

    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: createRasterStyle(),
        center: [location.lon, location.lat],
        zoom: location.source === "geolocation" ? 16 : 12,
        bearing: 0,
        pitch: 0,
        minZoom: 2,
        maxZoom: 19,
        attributionControl: false
      });
    } catch {
      setMapError("Map rendering is unavailable in this browser.");
      return;
    }

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.dragRotate.enable();
    map.touchZoomRotate.enable();
    map.touchZoomRotate.enableRotation();

    const updateBearing = () => onBearingChange(map.getBearing());
    map.on("rotate", updateBearing);
    map.on("moveend", updateBearing);

    map.on("load", () => {
      loadedRef.current = true;
      map.addSource(LINE_SOURCE_ID, {
        type: "geojson",
        data: createQiblaLineCollection(location),
        lineMetrics: true
      });

      map.addLayer({
        id: "qibla-line-shadow",
        type: "line",
        source: LINE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#8a4314",
          "line-opacity": 0.24,
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 6, 12, 12, 18, 18],
          "line-blur": 5
        }
      });

      map.addLayer({
        id: "qibla-line-glow",
        type: "line",
        source: LINE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffb000",
          "line-opacity": 0.32,
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 4, 12, 8, 18, 12],
          "line-blur": 2.8
        }
      });

      map.addLayer({
        id: "qibla-line-core",
        type: "line",
        source: LINE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffb000",
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 2.4, 12, 4.6, 18, 7],
          "line-opacity": 0.96
        }
      });

      userMarkerRef.current = new maplibregl.Marker({
        element: createMarkerElement("map-marker user-marker", "Current or selected location"),
        anchor: "center"
      })
        .setLngLat([location.lon, location.lat])
        .addTo(map);

      kaabaMarkerRef.current = new maplibregl.Marker({
        element: createMarkerElement("map-marker kaaba-marker", "Kaaba"),
        anchor: "center"
      })
        .setLngLat([KAABA.lon, KAABA.lat])
        .addTo(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateMapData = () => {
      const source = map.getSource(LINE_SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(createQiblaLineCollection(location));
      userMarkerRef.current?.setLngLat([location.lon, location.lat]);
      kaabaMarkerRef.current?.setLngLat([KAABA.lon, KAABA.lat]);
      map.easeTo({
        center: [location.lon, location.lat],
        zoom: location.source === "geolocation" ? 17 : 13,
        duration: 520
      });
    };

    if (loadedRef.current) {
      updateMapData();
    } else {
      map.once("load", updateMapData);
    }
  }, [location]);

  return (
    <div className="map-shell" aria-label="Map showing Qibla line">
      <div ref={mapContainerRef} className="map-container" />
      {mapError ? (
        <div className="map-fallback" role="status">
          <strong>Map rendering is unavailable</strong>
          <span>Qibla bearing and city selection still work. Try Safari or another browser with WebGL.</span>
        </div>
      ) : null}
      <div className="bearing-halo" aria-hidden="true" />
    </div>
  );
});
