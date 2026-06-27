import type { Coordinates } from "../types";

export const KAABA: Coordinates = {
  lat: 21.422487,
  lon: 39.826206
};

const EARTH_RADIUS_KM = 6371.0088;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function normalise360(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function normalise180(degrees: number): number {
  const normalised = normalise360(degrees);
  return normalised > 180 ? normalised - 360 : normalised;
}

export function calculateQiblaBearing(from: Coordinates, to: Coordinates = KAABA): number {
  const phi1 = toRadians(from.lat);
  const lambda1 = toRadians(from.lon);
  const phi2 = toRadians(to.lat);
  const lambda2 = toRadians(to.lon);
  const deltaLambda = lambda2 - lambda1;

  // Great-circle initial bearing from true north. This stays client-side and is independent of map rotation.
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);

  return normalise360(toDegrees(theta));
}

export function calculateDistanceKm(from: Coordinates, to: Coordinates = KAABA): number {
  const phi1 = toRadians(from.lat);
  const phi2 = toRadians(to.lat);
  const deltaPhi = toRadians(to.lat - from.lat);
  const deltaLambda = toRadians(to.lon - from.lon);

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function calculateQibla(from: Coordinates, to: Coordinates = KAABA) {
  return {
    bearing: calculateQiblaBearing(from, to),
    distanceKm: calculateDistanceKm(from, to)
  };
}

