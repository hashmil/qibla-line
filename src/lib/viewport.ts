import type { AppLocation } from "../types";

export type ViewInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const NO_INSETS: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 };

const CITY_ZOOM = 13;

export function sameInsets(a: Partial<ViewInsets>, b: ViewInsets): boolean {
  return (a.top ?? 0) === b.top && (a.right ?? 0) === b.right && (a.bottom ?? 0) === b.bottom && (a.left ?? 0) === b.left;
}

// True when a screen point lies inside the part of the map that panels do not cover.
export function isPointInView(
  point: { x: number; y: number },
  size: { width: number; height: number },
  insets: ViewInsets,
  margin = 12
): boolean {
  return (
    point.x >= insets.left + margin &&
    point.x <= size.width - insets.right - margin &&
    point.y >= insets.top + margin &&
    point.y <= size.height - insets.bottom - margin
  );
}

// Street level for a precise fix, wider for a coarse one so the marker is not
// shown at building scale when it could be hundreds of metres out.
export function locationZoom(location: AppLocation): number {
  if (location.source !== "geolocation") return CITY_ZOOM;

  const accuracy = location.accuracy ?? 0;
  if (accuracy <= 50) return 17;
  if (accuracy <= 250) return 16;
  if (accuracy <= 1000) return 15;
  return CITY_ZOOM;
}
