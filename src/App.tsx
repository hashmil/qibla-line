import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { DEFAULT_CITY } from "./data/cities";
import { calculateQibla, normalise180 } from "./lib/qibla";
import { getCompassReading, requestCompassPermission } from "./lib/compass";
import { usePwaInstall } from "./lib/install";
import type { AppLocation, CompassReading, CompassStatus } from "./types";
import { Dial } from "./components/Dial";
import { FaceCard } from "./components/FaceCard";
import { InstallSheet } from "./components/InstallSheet";
import { MapButtons } from "./components/MapButtons";
import { MapView, type MapViewHandle } from "./components/MapView";
import { PlacePanel } from "./components/PlacePanel";
import { TopBar, type Step } from "./components/TopBar";

const DEFAULT_LOCATION: AppLocation = {
  label: DEFAULT_CITY.city,
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
    return "Location isn't supported in this browser. Pick a city instead.";
  }

  if (!window.isSecureContext && window.location.hostname !== "localhost") {
    return "Location needs a secure (https) page. Pick a city instead.";
  }

  if (!error || !("code" in error)) {
    return "Your location couldn't be found. Pick a city instead.";
  }

  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Pick a city instead, or allow location in Settings.";
  }

  if (error.code === error.TIMEOUT) {
    return "Finding your location took too long. Try again, or pick a city.";
  }

  return "Your location is unavailable. Pick a city instead.";
}

function compassHelp(status: CompassStatus, reading: CompassReading | null): string | null {
  switch (status) {
    case "requesting":
      return "Asking for compass access.";
    case "active":
      return reading
        ? "Following your phone's compass. It can drift indoors, so check the map still matches."
        : "Waiting for the compass. Move the phone gently.";
    case "denied":
      return "Compass access was denied. Use the dial instead.";
    case "unsupported":
      return "This device has no compass. Use the dial instead.";
    case "error":
      return "The compass isn't responding. Use the dial instead.";
    default:
      return null;
  }
}

function useHeight(ref: RefObject<HTMLElement | null>, key: unknown): number {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      setHeight(0);
      return undefined;
    }

    const observer = new ResizeObserver(() => setHeight(element.getBoundingClientRect().height));
    observer.observe(element);
    setHeight(element.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, [ref, key]);

  return height;
}

export default function App() {
  const mapRef = useRef<MapViewHandle | null>(null);
  const topBarRef = useRef<HTMLElement | null>(null);
  const bottomRef = useRef<HTMLElement | null>(null);
  const locationRequestIdRef = useRef(0);
  const compassRequestIdRef = useRef(0);
  const pendingCompassReadingRef = useRef<CompassReading | null>(null);
  const compassFrameRef = useRef<number | null>(null);
  const [step, setStep] = useState<Step>("place");
  const [location, setLocation] = useState<AppLocation>(DEFAULT_LOCATION);
  const [hasPlace, setHasPlace] = useState(false);
  const [mapBearing, setMapBearing] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState("");
  const [compassStatus, setCompassStatus] = useState<CompassStatus>("idle");
  const [compassReading, setCompassReading] = useState<CompassReading | null>(null);

  const install = usePwaInstall();
  const [installOpen, setInstallOpen] = useState(false);

  const topHeight = useHeight(topBarRef, step);
  const bottomHeight = useHeight(bottomRef, step);

  const qibla = useMemo(() => calculateQibla(location), [location]);
  const relativeBearing = normalise180(qibla.bearing - mapBearing);
  const compassOn = compassStatus === "active" || compassStatus === "requesting";
  const compassFollowing = compassStatus === "active" && compassReading !== null;

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
    setHasPlace(true);
    setIsLocating(false);
    setMessage("");
    setStep("match");
  }

  function useBrowserLocation() {
    const requestId = locationRequestIdRef.current + 1;
    locationRequestIdRef.current = requestId;

    if (!("geolocation" in navigator) || (!window.isSecureContext && window.location.hostname !== "localhost")) {
      setIsLocating(false);
      setMessage(geolocationErrorMessage(null));
      return;
    }

    setIsLocating(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationRequestIdRef.current !== requestId) return;

        selectLocation({
          label: "My location",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: "geolocation"
        });
      },
      (error) => {
        if (locationRequestIdRef.current !== requestId) return;

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
    if (compassOn) {
      stopCompassFollow();
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

  function turnMap(bearing: number) {
    stopCompassFollow();
    mapRef.current?.setBearing(bearing);
  }

  const changePlace = () => {
    stopCompassFollow();
    setStep("place");
  };

  const copy: Record<Step, { title: string; help: string }> = {
    place: { title: "Where are you praying?", help: "Your location stays in this browser. It is only used to work out the Qibla." },
    match: {
      title: "Match the map to your room",
      help: compassHelp(compassStatus, compassReading) ?? "Turn the dial until a road or wall on the map lines up with one you can see."
    },
    face: {
      title: "Face along the amber line",
      help: compassHelp(compassStatus, compassReading) ?? "Keep the phone as it is. The amber line points to the Kaaba."
    }
  };

  return (
    <main className="app-shell" style={{ ["--top-h" as string]: `${topHeight}px`, ["--bottom-h" as string]: `${bottomHeight}px` }}>
      <MapView
        ref={mapRef}
        location={location}
        followHeading={compassFollowing ? compassReading.heading : null}
        rotationLocked={step !== "match"}
        padding={{ top: topHeight, bottom: bottomHeight }}
        onBearingChange={setMapBearing}
      />

      <TopBar
        ref={topBarRef}
        step={step}
        title={copy[step].title}
        help={copy[step].help}
        placeLabel={hasPlace && step !== "place" ? location.label : undefined}
        onChangePlace={changePlace}
        onInstall={step === "place" && !install.installed ? () => setInstallOpen(true) : undefined}
      />

      {step === "place" ? (
        <PlacePanel
          onUseLocation={useBrowserLocation}
          onSelectCity={selectLocation}
          message={message}
          isLocating={isLocating}
        />
      ) : (
        <MapButtons
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onRecentre={() => mapRef.current?.recentre()}
          compassOn={compassOn}
          onToggleCompass={toggleCompass}
        />
      )}

      {step === "match" ? (
        <section ref={bottomRef} className="match-controls" aria-label="Turn the map">
          <Dial bearing={mapBearing} qiblaBearing={qibla.bearing} onTurn={turnMap} />
          <button className="primary-action" type="button" onClick={() => setStep("face")}>
            It matches
          </button>
        </section>
      ) : null}

      {step === "face" ? (
        <FaceCard
          ref={bottomRef}
          relativeBearing={relativeBearing}
          qiblaBearing={qibla.bearing}
          distanceKm={qibla.distanceKm}
          placeLabel={location.label}
          accuracy={location.accuracy}
          compassFollowing={compassFollowing}
          onRematch={() => setStep("match")}
          onChangePlace={changePlace}
        />
      ) : null}

      {installOpen ? (
        <InstallSheet
          canPrompt={install.canPrompt}
          onPromptInstall={async () => {
            await install.promptInstall();
            setInstallOpen(false);
          }}
          onClose={() => setInstallOpen(false)}
        />
      ) : null}
    </main>
  );
}
