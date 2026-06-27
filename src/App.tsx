import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CITY } from "./data/cities";
import { calculateQibla, normalise180 } from "./lib/qibla";
import { getCompassReading, requestCompassPermission } from "./lib/compass";
import type { AppLocation, CompassReading, CompassStatus } from "./types";
import { ControlSheet } from "./components/ControlSheet";
import { CompassOverlay } from "./components/CompassOverlay";
import { MapView, type MapViewHandle } from "./components/MapView";
import { PermissionPanel } from "./components/PermissionPanel";
import { StatusPill } from "./components/StatusPill";

const DEFAULT_LOCATION: AppLocation = {
  label: `${DEFAULT_CITY.city}, ${DEFAULT_CITY.country}`,
  lat: DEFAULT_CITY.lat,
  lon: DEFAULT_CITY.lon,
  source: "fallback"
};

const COMPASS_SOURCE_PRIORITY: Record<CompassReading["source"], number> = {
  relative: 0,
  absolute: 1,
  webkit: 2
};

function preferCompassReading(current: CompassReading | null, next: CompassReading): CompassReading {
  if (!current) return next;
  if (COMPASS_SOURCE_PRIORITY[next.source] < COMPASS_SOURCE_PRIORITY[current.source]) {
    return current;
  }

  return next;
}

function shouldReplaceCompassReading(current: CompassReading | null, next: CompassReading): boolean {
  if (!current) return true;
  if (current.source !== next.source) return true;
  if (current.accuracy !== next.accuracy) return true;

  return Math.abs(normalise180(next.heading - current.heading)) >= 0.5;
}

function geolocationErrorMessage(error: GeolocationPositionError | Error | null): string {
  if (!("geolocation" in navigator)) {
    return "Location is not supported here. Your current selection is unchanged.";
  }

  if (!window.isSecureContext && window.location.hostname !== "localhost") {
    return "Location needs HTTPS. Your current selection is unchanged.";
  }

  if (!error || !("code" in error)) {
    return "Location could not be found. Your current selection is unchanged.";
  }

  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Your current selection is unchanged.";
  }

  if (error.code === error.TIMEOUT) {
    return "Location timed out. Your current selection is unchanged.";
  }

  return "Location is unavailable. Your current selection is unchanged.";
}

export default function App() {
  const mapRef = useRef<MapViewHandle | null>(null);
  const locationRequestIdRef = useRef(0);
  const compassRequestIdRef = useRef(0);
  const pendingCompassReadingRef = useRef<CompassReading | null>(null);
  const compassFrameRef = useRef<number | null>(null);
  const [location, setLocation] = useState<AppLocation>(DEFAULT_LOCATION);
  const [mapBearing, setMapBearing] = useState(0);
  const [introVisible, setIntroVisible] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState("");
  const [compassStatus, setCompassStatus] = useState<CompassStatus>("idle");
  const [compassReading, setCompassReading] = useState<CompassReading | null>(null);

  const qibla = useMemo(() => calculateQibla(location), [location]);
  const relativeBearing = normalise180(qibla.bearing - mapBearing);
  const compassActive = compassStatus === "active" || compassStatus === "requesting";

  useEffect(() => {
    if (compassStatus !== "active") return undefined;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const nextReading = getCompassReading(event);
      if (nextReading) {
        pendingCompassReadingRef.current = preferCompassReading(pendingCompassReadingRef.current, nextReading);

        if (compassFrameRef.current !== null) return;

        compassFrameRef.current = window.requestAnimationFrame(() => {
          compassFrameRef.current = null;
          const pendingReading = pendingCompassReadingRef.current;
          pendingCompassReadingRef.current = null;

          if (!pendingReading) return;

          setCompassReading((current) => {
            const preferredReading = preferCompassReading(current, pendingReading);
            return shouldReplaceCompassReading(current, preferredReading) ? preferredReading : current;
          });
        });
      }
    };

    window.addEventListener("deviceorientationabsolute", handleOrientation);
    window.addEventListener("deviceorientation", handleOrientation);

    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation);
      window.removeEventListener("deviceorientation", handleOrientation);
      pendingCompassReadingRef.current = null;
      if (compassFrameRef.current !== null) {
        window.cancelAnimationFrame(compassFrameRef.current);
        compassFrameRef.current = null;
      }
    };
  }, [compassStatus]);

  function selectLocation(nextLocation: AppLocation) {
    locationRequestIdRef.current += 1;
    setLocation(nextLocation);
    setIntroVisible(false);
    setIsLocating(false);
    setMessage("");
  }

  function useBrowserLocation() {
    const requestId = locationRequestIdRef.current + 1;
    locationRequestIdRef.current = requestId;

    if (!("geolocation" in navigator) || (!window.isSecureContext && window.location.hostname !== "localhost")) {
      setIntroVisible(false);
      setIsLocating(false);
      setMessage(geolocationErrorMessage(null));
      return;
    }

    setIsLocating(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationRequestIdRef.current !== requestId) return;

        setLocation({
          label: "My location",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: "geolocation"
        });
        setIntroVisible(false);
        setIsLocating(false);
        setMessage(
          position.coords.accuracy
            ? `Location found within about ${Math.round(position.coords.accuracy)} m.`
            : "Location found."
        );
      },
      (error) => {
        if (locationRequestIdRef.current !== requestId) return;

        setIntroVisible(false);
        setIsLocating(false);
        setMessage(geolocationErrorMessage(error));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }

  async function toggleCompass() {
    if (compassStatus === "active" || compassStatus === "requesting") {
      compassRequestIdRef.current += 1;
      setCompassStatus("idle");
      setCompassReading(null);
      return;
    }

    const requestId = compassRequestIdRef.current + 1;
    compassRequestIdRef.current = requestId;
    setCompassStatus("requesting");
    try {
      const permission = await requestCompassPermission();
      if (compassRequestIdRef.current !== requestId) return;
      setCompassStatus(permission === "granted" ? "active" : permission);
    } catch {
      if (compassRequestIdRef.current !== requestId) return;
      setCompassStatus("error");
    }
  }

  function stopCompassFollow() {
    if (compassStatus === "active" || compassStatus === "requesting") {
      compassRequestIdRef.current += 1;
      setCompassStatus("idle");
      setCompassReading(null);
    }
  }

  return (
    <main className="app-shell">
      <MapView
        ref={mapRef}
        location={location}
        followHeading={compassStatus === "active" && compassReading ? compassReading.heading : null}
        onBearingChange={setMapBearing}
      />
      <StatusPill
        bearing={qibla.bearing}
        distanceKm={qibla.distanceKm}
        mapBearing={mapBearing}
        relativeBearing={relativeBearing}
        locationLabel={location.label}
      />
      <CompassOverlay
        status={compassStatus}
        reading={compassReading}
        qiblaBearing={qibla.bearing}
        mapBearing={mapBearing}
        relativeBearing={relativeBearing}
        onToggle={toggleCompass}
      />

      {introVisible ? (
        <PermissionPanel
          onUseLocation={useBrowserLocation}
          onSelectCity={selectLocation}
          statusMessage={message}
          isLocating={isLocating}
        />
      ) : null}

      {!introVisible ? (
        <ControlSheet
          onRotate={(degrees) => {
            stopCompassFollow();
            mapRef.current?.rotateBy(degrees);
          }}
          onNorthUp={() => {
            stopCompassFollow();
            mapRef.current?.setNorthUp();
          }}
          onQiblaUp={() => {
            stopCompassFollow();
            mapRef.current?.setQiblaUp(qibla.bearing);
          }}
          onRecentre={() => mapRef.current?.recentre()}
          onSelectLocation={selectLocation}
          onUseLocation={useBrowserLocation}
          isLocating={isLocating}
          message={message}
          showUseLocationShortcut={location.source !== "geolocation" && !compassActive}
          compassStatus={compassStatus}
          compassReading={compassReading}
          onToggleCompass={toggleCompass}
          compactPreferred={compassActive}
        />
      ) : null}
    </main>
  );
}
