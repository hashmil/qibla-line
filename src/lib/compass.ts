import type { CompassReading } from "../types";
import { normalise360 } from "./qibla";

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

type CompassEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

function getScreenOrientationAngle(): number {
  if (typeof window === "undefined") return 0;

  if (typeof window.screen?.orientation?.angle === "number") {
    return window.screen.orientation.angle;
  }

  const legacyWindow = window as Window & { orientation?: number };
  return typeof legacyWindow.orientation === "number" ? legacyWindow.orientation : 0;
}

export async function requestCompassPermission(): Promise<"granted" | "denied" | "unsupported"> {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
    return "unsupported";
  }

  const orientationEvent = DeviceOrientationEvent as DeviceOrientationEventWithPermission;
  if (typeof orientationEvent.requestPermission === "function") {
    // iOS only honours this inside the tap that triggered it, so there is no point retrying.
    const permission = await orientationEvent.requestPermission();
    return permission === "granted" ? "granted" : "denied";
  }

  return "granted";
}

export function getCompassReading(event: DeviceOrientationEvent): CompassReading | null {
  const compassEvent = event as CompassEvent;
  const screenAngle = getScreenOrientationAngle();

  if (Number.isFinite(compassEvent.webkitCompassHeading)) {
    const reading: CompassReading = {
      heading: normalise360(compassEvent.webkitCompassHeading! + screenAngle),
      source: "webkit"
    };

    // iOS reports -1 while the compass is uncalibrated.
    const accuracy = compassEvent.webkitCompassAccuracy;
    if (typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy >= 0) {
      reading.accuracy = accuracy;
    }

    return reading;
  }

  if (typeof event.alpha === "number" && Number.isFinite(event.alpha)) {
    return {
      heading: normalise360(360 - event.alpha + screenAngle),
      source: event.absolute ? "absolute" : "relative"
    };
  }

  return null;
}
