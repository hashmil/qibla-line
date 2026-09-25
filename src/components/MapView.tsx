import maplibregl, { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { AppLocation } from "../types";
import { KAABA } from "../lib/qibla";
import { createQiblaLineCollection } from "../lib/geo";
import { createRasterStyle } from "../lib/mapStyle";

export type MapViewHandle = {
  setBearing: (bearing: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  recentre: () => void;
};

type MapPadding = { top: number; bottom: number };

type MapViewProps = {
  location: AppLocation;
  followHeading?: number | null;
  rotationLocked: boolean;
  padding: MapPadding;
  onBearingChange: (bearing: number) => void;
};

const LINE_SOURCE_ID = "qibla-line-source";
const AMBER = "#ffb23e";

function createMarkerElement(className: string, label: string): HTMLElement {
  const element = document.createElement("div");
  element.className = className;
  element.setAttribute("aria-label", label);
  element.setAttribute("role", "img");
  return element;
}

function locationZoom(location: AppLocation): number {
  return location.source === "geolocation" ? 18 : 14;
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { location, followHeading = null, rotationLocked, padding, onBearingChange },
  ref
) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const kaabaMarkerRef = useRef<Marker | null>(null);
  const loadedRef = useRef(false);
  const flightRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const [mapError, setMapError] = useState("");

  useImperativeHandle(
    ref,
    () => ({
      setBearing(bearing: number) {
        mapRef.current?.setBearing(bearing);
      },
      zoomIn() {
        mapRef.current?.zoomIn({ duration: 220 });
      },
      zoomOut() {
        mapRef.current?.zoomOut({ duration: 220 });
      },
      recentre() {
        mapRef.current?.easeTo({
          center: [location.lon, location.lat],
          zoom: locationZoom(location),
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
        zoom: locationZoom(location),
        bearing: 0,
        pitch: 0,
        minZoom: 2,
        maxZoom: 19,
        attributionControl: false,
        pitchWithRotate: false
      });
    } catch {
      setMapError("Map rendering is unavailable in this browser.");
      return;
    }

    map.touchPitch.disable();

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
        id: "qibla-line-glow",
        type: "line",
        source: LINE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": AMBER,
          "line-opacity": 0.25,
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 8, 12, 14, 18, 20],
          "line-blur": 6
        }
      });

      map.addLayer({
        id: "qibla-line-core",
        type: "line",
        source: LINE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": AMBER,
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 2.4, 12, 3.6, 18, 5]
        }
      });

      userMarkerRef.current = new maplibregl.Marker({
        element: createMarkerElement("map-marker user-marker", "Your selected location"),
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
      flightRef.current = { center: [location.lon, location.lat], zoom: locationZoom(location) };
      map.easeTo({ ...flightRef.current, duration: 520 });
      map.once("moveend", () => {
        flightRef.current = null;
      });
    };

    if (loadedRef.current) {
      updateMapData();
    } else {
      map.once("load", updateMapData);
    }
  }, [location]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (rotationLocked) {
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
    } else {
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
      map.keyboard.enableRotation();
    }
  }, [rotationLocked]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const next = { top: padding.top, bottom: padding.bottom, left: 0, right: 0 };
    // Any camera change cancels a running ease, so if we're mid-flight to a new location,
    // re-aim that flight with the new padding instead of stopping it short.
    if (flightRef.current && map.isEasing()) {
      map.easeTo({ ...flightRef.current, padding: next, duration: 420 });
    } else {
      map.setPadding(next);
    }
  }, [padding.top, padding.bottom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || followHeading === null) return;

    map.setBearing(followHeading);
    onBearingChange(map.getBearing());
  }, [followHeading, onBearingChange]);

  return (
    <div className="map-shell" aria-label="Map showing the Qibla line">
      <div ref={mapContainerRef} className="map-container" />
      {mapError ? (
        <div className="map-fallback" role="status">
          <strong>Map rendering is unavailable</strong>
          <span>The Qibla bearing still works. Try Safari or another browser with WebGL.</span>
        </div>
      ) : null}
    </div>
  );
});
