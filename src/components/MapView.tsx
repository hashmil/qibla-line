import maplibregl, { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { AppLocation } from "../types";
import { KAABA } from "../lib/qibla";
import { createQiblaLineCollection } from "../lib/geo";
import { createRasterStyle } from "../lib/mapStyle";
import { NO_INSETS, isPointInView, locationZoom, sameInsets, type ViewInsets } from "../lib/viewport";

export type MapViewHandle = {
  rotateBy: (degrees: number) => void;
  setNorthUp: () => void;
  setQiblaUp: (bearing: number) => void;
  recentre: () => void;
};

type MapViewProps = {
  location: AppLocation;
  followHeading?: number | null;
  insets?: ViewInsets;
  onBearingChange: (bearing: number) => void;
  onLocationVisibilityChange?: (visible: boolean) => void;
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
  { location, followHeading = null, insets = NO_INSETS, onBearingChange, onLocationVisibilityChange },
  ref
) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const kaabaMarkerRef = useRef<Marker | null>(null);
  const loadedRef = useRef(false);
  const previousSourceRef = useRef(location.source);
  const targetBearingRef = useRef<number | null>(null);
  const locationRef = useRef(location);
  const insetsRef = useRef(insets);
  const visibilityCallbackRef = useRef(onLocationVisibilityChange);
  const [mapError, setMapError] = useState("");

  locationRef.current = location;
  insetsRef.current = insets;
  visibilityCallbackRef.current = onLocationVisibilityChange;

  // Reports whether the location marker sits in the part of the map not covered by panels.
  function reportLocationVisibility() {
    const map = mapRef.current;
    const report = visibilityCallbackRef.current;
    if (!map || !report) return;

    const { lon, lat } = locationRef.current;
    const container = map.getContainer();
    report(
      isPointInView(
        map.project([lon, lat]),
        { width: container.clientWidth, height: container.clientHeight },
        insetsRef.current
      )
    );
  }

  function easeBearing(bearing: number, duration: number) {
    // Set the target after easeTo: interrupting the previous ease fires moveend
    // synchronously, which clears the target.
    mapRef.current?.easeTo({ bearing, duration });
    targetBearingRef.current = bearing;
  }

  useImperativeHandle(
    ref,
    () => ({
      rotateBy(degrees: number) {
        const map = mapRef.current;
        if (!map) return;
        // Build on the pending target so quick taps add up instead of restarting mid-ease.
        easeBearing((targetBearingRef.current ?? map.getBearing()) + degrees, 180);
      },
      setNorthUp() {
        easeBearing(0, 260);
      },
      setQiblaUp(bearing: number) {
        easeBearing(bearing, 320);
      },
      recentre() {
        const map = mapRef.current;
        if (!map) return;

        const current = locationRef.current;
        visibilityCallbackRef.current?.(true);
        map.easeTo({
          center: [current.lon, current.lat],
          zoom: Math.max(map.getZoom(), locationZoom(current)),
          padding: insetsRef.current,
          duration: 360
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
        attributionControl: false
      });
    } catch {
      setMapError("Map rendering is unavailable in this browser.");
      return;
    }

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-left");
    map.dragRotate.enable();
    map.touchZoomRotate.enable();
    map.touchZoomRotate.enableRotation();

    const updateBearing = () => onBearingChange(map.getBearing());
    map.on("rotate", updateBearing);
    map.on("moveend", () => {
      targetBearingRef.current = null;
      updateBearing();
      reportLocationVisibility();
    });
    // Programmatic camera moves only report once they settle, so the recentre
    // prompt does not flicker on while the map flies to a new location.
    map.on("move", (event) => {
      if (event.originalEvent) reportLocationVisibility();
    });
    map.on("resize", reportLocationVisibility);

    map.on("load", () => {
      const current = locationRef.current;
      loadedRef.current = true;
      map.addSource(LINE_SOURCE_ID, {
        type: "geojson",
        data: createQiblaLineCollection(current),
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
        .setLngLat([current.lon, current.lat])
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
      loadedRef.current = false;
      userMarkerRef.current = null;
      kaabaMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    // Leaving the fallback city is the first real fix, so jump there rather than
    // sweeping across the map from the default view.
    const animate = previousSourceRef.current !== "fallback";
    previousSourceRef.current = location.source;

    const updateMapData = () => {
      const source = map.getSource(LINE_SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(createQiblaLineCollection(location));
      userMarkerRef.current?.setLngLat([location.lon, location.lat]);
      visibilityCallbackRef.current?.(true);

      const camera = {
        center: [location.lon, location.lat] as [number, number],
        zoom: locationZoom(location),
        padding: insetsRef.current
      };

      if (animate) {
        map.easeTo({ ...camera, duration: 520 });
      } else {
        map.jumpTo(camera);
      }
    };

    if (loadedRef.current) {
      updateMapData();
      return undefined;
    }

    map.once("load", updateMapData);
    return () => {
      map.off("load", updateMapData);
    };
  }, [location]);

  // Pad the camera by the panels so "centre" means the centre of the visible map.
  // Waits for any camera move to settle so it never cuts an ease short.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const applyPadding = () => {
      if (map.isMoving()) {
        map.once("moveend", applyPadding);
        return;
      }

      if (sameInsets(map.getPadding(), insets)) {
        reportLocationVisibility();
      } else {
        map.easeTo({ padding: insets, duration: 240 });
      }
    };

    if (loadedRef.current) {
      applyPadding();
    } else {
      map.once("load", applyPadding);
    }

    return () => {
      map.off("load", applyPadding);
      map.off("moveend", applyPadding);
    };
  }, [insets]);

  useEffect(() => {
    const map = mapRef.current;
    // Skip while an ease runs: setBearing would cancel it and strand the camera.
    if (!map || followHeading === null || map.isEasing()) return;

    map.setBearing(followHeading);
  }, [followHeading]);

  return (
    <div className="map-shell" role="region" aria-label="Map showing Qibla line">
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
