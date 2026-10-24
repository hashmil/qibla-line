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

// absolute=true asks for the magnetic compass; false is enough for gyroscope-only rotation
export async function requestCompassPermission(absolute = true): Promise<"granted" | "denied" | "unsupported"> {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
    return "unsupported";
  }

  const orientationEvent = DeviceOrientationEvent as DeviceOrientationEventWithPermission;
  if (typeof orientationEvent.requestPermission === "function") {
    try {
      const permission = await orientationEvent.requestPermission(absolute);
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

  const webkitHeading = compassEvent.webkitCompassHeading;
  if (typeof webkitHeading === "number" && Number.isFinite(webkitHeading)) {
    const reading: CompassReading = {
      heading: normalise360(webkitHeading + screenAngle),
      source: "webkit"
    };

    // iOS reports -1 while the compass is uncalibrated
    const accuracy = compassEvent.webkitCompassAccuracy;
    if (typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy >= 0) {
      reading.accuracy = accuracy;
    }

    return reading;
  }

  // A relative alpha counts from wherever the phone pointed when tracking started, so
  // it can't say where north is. Firefox and some Android browsers only send these.
  if (event.absolute && typeof event.alpha === "number" && Number.isFinite(event.alpha)) {
    return {
      heading: normalise360(360 - event.alpha + screenAngle),
      source: "absolute"
    };
  }

  return null;
}
