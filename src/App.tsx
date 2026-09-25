import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { DEFAULT_CITY } from "./data/cities";
import { calculateQibla, normalise180 } from "./lib/qibla";
import { getCompassReading, requestCompassPermission } from "./lib/compass";
import { createTurnTracker, headingAfterTurn, isRoughlyFlat } from "./lib/gyro";
import { detectPlatform, rememberInstallDismissed, shouldAutoShowInstall, usePwaInstall } from "./lib/install";
import type { AppLocation, CompassReading, CompassStatus } from "./types";
import { Dial } from "./components/Dial";
import { FaceCard, type FaceMode } from "./components/FaceCard";
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

type GyroStatus = "off" | "requesting" | "starting" | "active" | "denied" | "unsupported";

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
  const [gyroStatus, setGyroStatus] = useState<GyroStatus>("off");
  const [flat, setFlat] = useState(true);
  const [gridActive, setGridActive] = useState(false);
  const matchedBearingRef = useRef(0);
  const trackerRef = useRef(createTurnTracker());

  const install = usePwaInstall();
  const [installOpen, setInstallOpen] = useState(false);
  const autoInstallCheckedRef = useRef(false);

  // Offer installation once, shortly after opening, unless installed or recently dismissed.
  // Re-checks when Chrome's install prompt becomes available, which can arrive after load.
  useEffect(() => {
    if (install.installed || autoInstallCheckedRef.current) return undefined;
    if (!shouldAutoShowInstall(detectPlatform(), install.canPrompt)) return undefined;
    const timer = window.setTimeout(() => {
      autoInstallCheckedRef.current = true;
      setInstallOpen(true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [install.installed, install.canPrompt]);

  function closeInstall() {
    rememberInstallDismissed();
    setInstallOpen(false);
  }

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

  // After "It lines up", follow the phone's turns with the gyroscope so the map stays
  // lined up with the room while the user turns to face the Qibla.
  useEffect(() => {
    if (gyroStatus !== "starting" && gyroStatus !== "active") return undefined;

    let frame: number | null = null;
    let turned = 0;
    let flatNow = true;
    let started = false;
    const noReadings = window.setTimeout(() => setGyroStatus((s) => (s === "starting" ? "unsupported" : s)), 2500);

    // Redraw at most once a frame
    const apply = () => {
      frame = null;
      mapRef.current?.setBearing(headingAfterTurn(matchedBearingRef.current, turned));
      setFlat(flatNow);
    };

    // Count every reading as it arrives, even when frames are throttled (Low Power Mode),
    // so a quick turn between frames can't be misread across the 0/360 seam
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (typeof event.alpha !== "number") return;
      turned = trackerRef.current.update(event.alpha);
      flatNow = isRoughlyFlat(event.beta, event.gamma);
      if (!started) {
        started = true;
        setGyroStatus((s) => (s === "starting" ? "active" : s));
      }
      if (frame === null) frame = window.requestAnimationFrame(apply);
    };

    window.addEventListener("deviceorientation", onOrientation);
    return () => {
      window.clearTimeout(noReadings);
      window.removeEventListener("deviceorientation", onOrientation);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [gyroStatus === "starting" || gyroStatus === "active"]);

  // The grid brightens while the map is turning, then settles back to faint
  useEffect(() => {
    if (step !== "match") return undefined;
    setGridActive(true);
    const timer = window.setTimeout(() => setGridActive(false), 1200);
    return () => window.clearTimeout(timer);
  }, [mapBearing, step]);

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

    stopGuide();

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

  function stopGuide() {
    trackerRef.current.reset();
    setGyroStatus("off");
    setFlat(true);
  }

  async function confirmMatch() {
    matchedBearingRef.current = mapBearing;
    setStep("face");
    if (compassFollowing) return;

    trackerRef.current.reset();
    setGyroStatus("requesting");
    try {
      // Called straight from the tap, which iOS requires for the permission prompt
      const permission = await requestCompassPermission(false);
      setGyroStatus(permission === "granted" ? "starting" : permission);
    } catch {
      setGyroStatus("unsupported");
    }
  }

  function lineUpAgain() {
    stopGuide();
    setStep("match");
    mapRef.current?.setBearing(matchedBearingRef.current);
  }

  const changePlace = () => {
    stopCompassFollow();
    stopGuide();
    setStep("place");
  };

  const faceMode: FaceMode =
    compassFollowing || gyroStatus === "active"
      ? "live"
      : gyroStatus === "requesting" || gyroStatus === "starting"
        ? "starting"
        : "static";

  const staticReason =
    gyroStatus === "denied"
      ? "Motion access is off, so use the amber line on the map."
      : gyroStatus === "unsupported"
        ? "This phone can't track turns, so use the amber line on the map."
        : undefined;

  const copy: Record<Step, { title: string; help: string }> = {
    place: { title: "Where are you praying?", help: "Your location stays in this browser. It is only used to work out the Qibla." },
    match: {
      title: "Line the map up with a wall",
      help:
        compassHelp(compassStatus, compassReading) ??
        "Lay the phone along a wall, then turn the dial until that wall runs along the grid."
    },
    face:
      faceMode === "static"
        ? {
            title: "Face along the amber line",
            help: "The map is lined up with your wall, so the amber line points to the Kaaba."
          }
        : {
            title: "Turn to face the Qibla",
            help:
              compassHelp(compassStatus, compassReading) ??
              "Pick the phone up and hold it flat in front of you."
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

      {step === "match" ? <div className={gridActive ? "align-grid is-active" : "align-grid"} aria-hidden="true" /> : null}
      {step === "face" && faceMode === "live" ? <div className="ahead-mark" aria-hidden="true" /> : null}

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
          <button className="primary-action" type="button" onClick={confirmMatch}>
            It lines up
          </button>
        </section>
      ) : null}

      {step === "face" ? (
        <FaceCard
          ref={bottomRef}
          mode={faceMode}
          relativeBearing={relativeBearing}
          flat={flat}
          staticReason={staticReason}
          qiblaBearing={qibla.bearing}
          distanceKm={qibla.distanceKm}
          placeLabel={location.label}
          accuracy={location.accuracy}
          onRematch={lineUpAgain}
          onChangePlace={changePlace}
        />
      ) : null}

      {installOpen ? (
        <InstallSheet
          canPrompt={install.canPrompt}
          onPromptInstall={async () => {
            await install.promptInstall();
            closeInstall();
          }}
          onClose={closeInstall}
        />
      ) : null}
    </main>
  );
}
