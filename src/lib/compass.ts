import type { CompassReading } from "../types";
import { normalise360 } from "./qibla";

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: (absolute?: boolean) => Promise<PermissionState>;
};

type CompassEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

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

  if (typeof compassEvent.webkitCompassHeading === "number") {
    return {
      heading: normalise360(compassEvent.webkitCompassHeading),
      accuracy:
        typeof compassEvent.webkitCompassAccuracy === "number"
          ? compassEvent.webkitCompassAccuracy
          : undefined,
      source: "webkit"
    };
  }

  if (typeof event.alpha === "number") {
    return {
      heading: normalise360(360 - event.alpha),
      source: event.absolute ? "absolute" : "relative"
    };
  }

  return null;
}

