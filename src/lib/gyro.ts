import { normalise180, normalise360 } from "./qibla";

// Tracks how far the phone has turned since tracking started, from the orientation
// event's alpha. Browsers derive relative alpha from the gyroscope, so walls, steel
// and magnets don't affect it the way they affect the compass.
export function createTurnTracker() {
  let previous: number | null = null;
  let total = 0;

  return {
    // Returns total rotation in degrees, anticlockwise positive (alpha's direction)
    update(alpha: number): number {
      if (previous !== null) total += normalise180(alpha - previous);
      previous = alpha;
      return total;
    },
    reset() {
      previous = null;
      total = 0;
    }
  };
}

// Alpha grows anticlockwise, compass headings grow clockwise
export function headingAfterTurn(startHeading: number, alphaTurn: number): number {
  return normalise360(startHeading - alphaTurn);
}

// Phone is roughly flat, screen up: both tilts within 50 degrees
export function isRoughlyFlat(beta: number | null, gamma: number | null): boolean {
  if (beta === null || gamma === null) return true;
  return Math.abs(beta) < 50 && Math.abs(gamma) < 50;
}
