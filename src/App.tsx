import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { DEFAULT_CITY } from "./data/cities";
import { calculateQibla, normalise180 } from "./lib/qibla";
import { getCompassReading, requestCompassPermission } from "./lib/compass";
import { NO_INSETS, sameInsets, type ViewInsets } from "./lib/viewport";
import type { AppLocation, CompassReading, CompassStatus } from "./types";
import { ControlSheet } from "./components/ControlSheet";
import { CompassOverlay } from "./components/CompassOverlay";
import { MapView, type MapViewHandle } from "./components/MapView";
import { PermissionPanel } from "./components/PermissionPanel";
import { RecentrePill } from "./components/RecentrePill";
import { StatusPill } from "./components/StatusPill";

const DEFAULT_LOCATION: AppLocation = {
  label: `${DEFAULT_CITY.city}, ${DEFAULT_CITY.country}`,
  lat: DEFAULT_CITY.lat,
  lon: DEFAULT_CITY.lon,
  source: "fallback"
};

// Matches the breakpoint in global.css where the control sheet moves to the right-hand side.
const WIDE_LAYOUT_QUERY = "(min-width: 720px)";
const COMPASS_TIMEOUT_MS = 4000;
const TRANSIENT_MESSAGE_MS = 4000;

function recentreLabel(location: AppLocation): string {
  if (location.source === "geolocation") return "Centre on me";
  if (location.source === "manual") return "Centre on pin";
  return `Centre on ${location.label.split(",")[0]}`;
}

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
  const messageTimerRef = useRef<number | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const statusPillRef = useRef<HTMLElement | null>(null);
  const controlSheetRef = useRef<HTMLElement | null>(null);
  const [location, setLocation] = useState<AppLocation>(DEFAULT_LOCATION);
  const [mapBearing, setMapBearing] = useState(0);
  const [introVisible, setIntroVisible] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState("");
  const [compassStatus, setCompassStatus] = useState<CompassStatus>("idle");
  const [compassReading, setCompassReading] = useState<CompassReading | null>(null);
  const [locationInView, setLocationInView] = useState(true);
  const [mapInsets, setMapInsets] = useState<ViewInsets>(NO_INSETS);

  const qibla = useMemo(() => calculateQibla(location), [location]);
  const relativeBearing = normalise180(qibla.bearing - mapBearing);
  const compassActive = compassStatus === "active" || compassStatus === "requesting";

  // Measures how much of the map the status pill and control sheet cover, so the
  // camera can centre in the visible area and the recentre pill knows when to show.
  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;

    const measure = () => {
      const bounds = shell.getBoundingClientRect();
      const pill = statusPillRef.current?.getBoundingClientRect();
      const sheet = controlSheetRef.current?.getBoundingClientRect();
      const sheetOnSide = window.matchMedia(WIDE_LAYOUT_QUERY).matches;
      const next: ViewInsets = {
        top: pill ? Math.max(0, Math.round(pill.bottom - bounds.top)) : 0,
        right: sheet && sheetOnSide ? Math.max(0, Math.round(bounds.right - sheet.left)) : 0,
        bottom: sheet && !sheetOnSide ? Math.max(0, Math.round(bounds.bottom - sheet.top)) : 0,
        left: 0
      };

      setMapInsets((current) => (sameInsets(current, next) ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    for (const element of [shell, statusPillRef.current, controlSheetRef.current]) {
      if (element) observer.observe(element);
    }
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [introVisible]);

  useEffect(
    () => () => {
      if (messageTimerRef.current !== null) window.clearTimeout(messageTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (compassStatus !== "active") return undefined;

    let receivedHeading = false;
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const nextReading = getCompassReading(event);
      // Relative readings start from an arbitrary zero, so they cannot point the map north.
      if (nextReading && nextReading.source !== "relative") {
        receivedHeading = true;
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

    // Desktops and phones without a magnetometer never send a usable heading.
    const timeout = window.setTimeout(() => {
      if (receivedHeading) return;
      compassRequestIdRef.current += 1;
      setCompassStatus("unsupported");
    }, COMPASS_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("deviceorientationabsolute", handleOrientation);
      window.removeEventListener("deviceorientation", handleOrientation);
      pendingCompassReadingRef.current = null;
      if (compassFrameRef.current !== null) {
        window.cancelAnimationFrame(compassFrameRef.current);
        compassFrameRef.current = null;
      }
    };
  }, [compassStatus]);

  useEffect(() => {
    // If location access was already granted on a previous visit, locate straight away.
    // The intro stays up showing "Finding location" so the fallback city is never
    // presented as the user's position.
    let cancelled = false;
    const requestId = locationRequestIdRef.current;

    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((permission) => {
        if (cancelled || permission.state !== "granted") return;
        // The user picked a city or asked for location while we were checking.
        if (locationRequestIdRef.current !== requestId) return;
        locateUser();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  function showMessage(text: string, transient = false) {
    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }

    setMessage(text);

    if (transient) {
      messageTimerRef.current = window.setTimeout(() => {
        messageTimerRef.current = null;
        setMessage("");
      }, TRANSIENT_MESSAGE_MS);
    }
  }

  function selectLocation(nextLocation: AppLocation) {
    locationRequestIdRef.current += 1;
    setLocation(nextLocation);
    setIntroVisible(false);
    setIsLocating(false);
    showMessage("");
  }

  function locateUser() {
    const requestId = locationRequestIdRef.current + 1;
    locationRequestIdRef.current = requestId;

    if (!("geolocation" in navigator) || (!window.isSecureContext && window.location.hostname !== "localhost")) {
      setIntroVisible(false);
      setIsLocating(false);
      showMessage(geolocationErrorMessage(null));
      return;
    }

    setIsLocating(true);
    showMessage("");

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
        showMessage(
          position.coords.accuracy
            ? `Location found within about ${Math.round(position.coords.accuracy)} m.`
            : "Location found.",
          true
        );
      },
      (error) => {
        if (locationRequestIdRef.current !== requestId) return;

        setIntroVisible(false);
        setIsLocating(false);
        showMessage(geolocationErrorMessage(error));
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
    <main
      ref={shellRef}
      className="app-shell"
      style={
        {
          "--map-inset-top": `${mapInsets.top}px`,
          "--map-inset-right": `${mapInsets.right}px`,
          "--map-inset-bottom": `${mapInsets.bottom}px`,
          "--map-inset-left": `${mapInsets.left}px`
        } as CSSProperties
      }
    >
      {!introVisible ? <h1 className="visually-hidden">Qibla Line</h1> : null}
      <MapView
        ref={mapRef}
        location={location}
        followHeading={compassStatus === "active" && compassReading ? compassReading.heading : null}
        insets={mapInsets}
        onBearingChange={setMapBearing}
        onLocationVisibilityChange={setLocationInView}
      />
      <StatusPill
        ref={statusPillRef}
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
          onUseLocation={locateUser}
          onSelectCity={selectLocation}
          statusMessage={message}
          isLocating={isLocating}
        />
      ) : null}

      <RecentrePill
        visible={!introVisible && !compassActive && !locationInView}
        label={recentreLabel(location)}
        onRecentre={() => mapRef.current?.recentre()}
      />

      {!introVisible ? (
        <ControlSheet
          ref={controlSheetRef}
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
          onUseLocation={locateUser}
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
