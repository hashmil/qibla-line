import type { CompassReading } from "../types";
import { normalise360 } from "./qibla";

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: (absolute?: boolean) => Promise<PermissionState>;
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
    try {
      const permission = await orientationEvent.requestPermission(true);
      return permission === "granted" ? "granted" : "denied";
    } catch {
      const permission = await orientationEvent.requestPermission();
      return permission === "granted" ? "granted" : "denied";
    }
  }

  return "granted";
}

export function getCompassReading(event: DeviceOrientationEvent): CompassReading | null {
  const compassEvent = event as CompassEvent;
  const screenAngle = getScreenOrientationAngle();

  if (typeof compassEvent.webkitCompassHeading === "number") {
    const reading: CompassReading = {
      heading: normalise360(compassEvent.webkitCompassHeading + screenAngle),
      source: "webkit"
    };

    if (typeof compassEvent.webkitCompassAccuracy === "number") {
      reading.accuracy = compassEvent.webkitCompassAccuracy;
    }

    return reading;
  }

  if (typeof event.alpha === "number") {
    return {
      heading: normalise360(360 - event.alpha + screenAngle),
      source: event.absolute ? "absolute" : "relative"
    };
  }

  return null;
}
