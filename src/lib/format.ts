import { normalise180 } from "./qibla";

export function formatBearing(value: number): string {
  return `${value.toFixed(1)}° true`;
}

export function formatMapRotation(value: number): string {
  return `${Math.round(value)}°`;
}

export function formatDistance(km: number): string {
  if (km >= 1000) {
    return `${Math.round(km).toLocaleString("en-GB")} km`;
  }

  if (km >= 100) {
    return `${Math.round(km)} km`;
  }

  return `${km.toFixed(1)} km`;
}

export function formatRelativeBearing(value: number): string {
  const relative = normalise180(value);
  if (Math.abs(relative) < 0.5) {
    return "straight up";
  }

  return `${Math.abs(relative).toFixed(0)}° ${relative > 0 ? "clockwise" : "counter-clockwise"}`;
}

export function formatTurnInstruction(relative: number): string {
  const turn = normalise180(relative);
  if (Math.abs(turn) < 2) {
    return "Phone is aligned with the Qibla";
  }

  return `Turn phone ${Math.abs(turn).toFixed(0)}° ${turn > 0 ? "clockwise" : "counter-clockwise"}`;
}

