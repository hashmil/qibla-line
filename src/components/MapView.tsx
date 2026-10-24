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
  // True while the compass or gyroscope turns the map every frame
  headingLive?: boolean;
  rotationLocked: boolean;
  padding: MapPadding;
  onBearingChange: (bearing: number) => void;
  onLocationVisibilityChange?: (visible: boolean) => void;
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

// How far inside the visible map the dot must sit to count as on screen
const VISIBLE_MARGIN = 12;

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  {
    location,
    followHeading = null,
    headingLive = false,
    rotationLocked,
    padding,
    onBearingChange,
    onLocationVisibilityChange
  },
  ref
) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const loadedRef = useRef(false);
  const locationRef = useRef(location);
  const headingLiveRef = useRef(headingLive);
  const visibilityCallbackRef = useRef(onLocationVisibilityChange);
  const [mapError, setMapError] = useState("");

  locationRef.current = location;
  headingLiveRef.current = headingLive;
  visibilityCallbackRef.current = onLocationVisibilityChange;

  // A live heading turns the map every frame, and each turn would cut an animation
  // short, so camera moves are instant while it runs.
  const duration = (ms: number) => (headingLiveRef.current ? 0 : ms);

  // Tells the app whether the user's dot is inside the map area the bars leave visible
  function reportLocationVisibility() {
    const map = mapRef.current;
    const report = visibilityCallbackRef.current;
    if (!map || !report) return;

    const { lon, lat } = locationRef.current;
    const point = map.project([lon, lat]);
    const container = map.getContainer();
    const { top = 0, bottom = 0 } = map.getPadding();
    report(
      point.x >= VISIBLE_MARGIN &&
        point.x <= container.clientWidth - VISIBLE_MARGIN &&
        point.y >= top + VISIBLE_MARGIN &&
        point.y <= container.clientHeight - bottom - VISIBLE_MARGIN
    );
  }

  useImperativeHandle(
    ref,
    () => ({
      setBearing(bearing: number) {
        mapRef.current?.setBearing(bearing);
      },
      zoomIn() {
        mapRef.current?.zoomIn({ duration: duration(220) });
      },
      zoomOut() {
        mapRef.current?.zoomOut({ duration: duration(220) });
      },
      recentre() {
        const current = locationRef.current;
        visibilityCallbackRef.current?.(true);
        mapRef.current?.easeTo({
          center: [current.lon, current.lat],
          zoom: locationZoom(current),
          duration: duration(360)
        });
      }
    }),
    []
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
    // Only user drags report while moving; programmatic moves report once they settle,
    // so the centre button doesn't flash on while the camera moves to a new place.
    map.on("move", (event) => {
      if (event.originalEvent) reportLocationVisibility();
    });
    map.on("moveend", reportLocationVisibility);
    map.on("resize", reportLocationVisibility);

    // Markers don't need the style, so they show from the first frame rather than after the map loads
    userMarkerRef.current = new maplibregl.Marker({
      element: createMarkerElement("map-marker user-marker", "Your selected location"),
      anchor: "center"
    })
      .setLngLat([location.lon, location.lat])
      .addTo(map);

    new maplibregl.Marker({
      element: createMarkerElement("map-marker kaaba-marker", "Kaaba"),
      anchor: "center"
    })
      .setLngLat([KAABA.lon, KAABA.lat])
      .addTo(map);

    map.on("load", () => {
      loadedRef.current = true;
      map.addSource(LINE_SOURCE_ID, {
        type: "geojson",
        data: createQiblaLineCollection(locationRef.current),
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
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
      userMarkerRef.current = null;
    };
  }, []);

  // Go straight to a new place. The camera can move before the style loads, so the
  // first frame of the map already shows the place, and with no flight there is
  // nothing for a later padding change to cut short.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    userMarkerRef.current?.setLngLat([location.lon, location.lat]);
    if (loadedRef.current) {
      (map.getSource(LINE_SOURCE_ID) as GeoJSONSource | undefined)?.setData(createQiblaLineCollection(location));
    }
    visibilityCallbackRef.current?.(true);
    map.jumpTo({ center: [location.lon, location.lat], zoom: locationZoom(location) });
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
    // Any camera change cancels a running ease (zoom, recentre), so wait for it to finish
    const apply = () => {
      if (map.isEasing()) {
        map.once("moveend", apply);
        return;
      }
      map.setPadding(next);
    };

    apply();
    return () => {
      map.off("moveend", apply);
    };
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
