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

function geolocationErrorMessage(error: GeolocationPositionError | Error | null): string {
  if (!("geolocation" in navigator)) {
    return "Location is not supported here. Dubai is selected for now.";
  }

  if (!window.isSecureContext && window.location.hostname !== "localhost") {
    return "Location needs HTTPS. Dubai is selected for now.";
  }

  if (!error || !("code" in error)) {
    return "Location could not be found. Dubai is selected for now.";
  }

  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Dubai is selected for now.";
  }

  if (error.code === error.TIMEOUT) {
    return "Location timed out. Dubai is selected for now.";
  }

  return "Location is unavailable. Dubai is selected for now.";
}

export default function App() {
  const mapRef = useRef<MapViewHandle | null>(null);
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
        setCompassReading((current) => preferCompassReading(current, nextReading));
      }
    };

    window.addEventListener("deviceorientationabsolute", handleOrientation);
    window.addEventListener("deviceorientation", handleOrientation);

    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [compassStatus]);

  useEffect(() => {
    if (compassStatus !== "active" || !compassReading) return;
    mapRef.current?.followHeading(compassReading.heading);
  }, [compassReading, compassStatus]);

  function selectLocation(nextLocation: AppLocation) {
    setLocation(nextLocation);
    setIntroVisible(false);
    setMessage("");
  }

  function useBrowserLocation() {
    if (!("geolocation" in navigator) || (!window.isSecureContext && window.location.hostname !== "localhost")) {
      setLocation(DEFAULT_LOCATION);
      setIntroVisible(false);
      setMessage(geolocationErrorMessage(null));
      return;
    }

    setIsLocating(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
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
        setLocation(DEFAULT_LOCATION);
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
      setCompassStatus("idle");
      setCompassReading(null);
      return;
    }

    setCompassStatus("requesting");
    try {
      const permission = await requestCompassPermission();
      setCompassStatus(permission === "granted" ? "active" : permission);
    } catch {
      setCompassStatus("error");
    }
  }

  function stopCompassFollow() {
    if (compassStatus === "active" || compassStatus === "requesting") {
      setCompassStatus("idle");
      setCompassReading(null);
    }
  }

  return (
    <main className="app-shell">
      <MapView ref={mapRef} location={location} qiblaBearing={qibla.bearing} onBearingChange={setMapBearing} />
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
          compassStatus={compassStatus}
          compassReading={compassReading}
          onToggleCompass={toggleCompass}
          compactPreferred={compassActive}
        />
      ) : null}
    </main>
  );
}
