import type { Feature, FeatureCollection, LineString } from "geojson";
import type { Coordinates } from "../types";
import { KAABA, toDegrees, toRadians } from "./qibla";

type Vector3 = [number, number, number];

function toVector({ lat, lon }: Coordinates): Vector3 {
  const phi = toRadians(lat);
  const lambda = toRadians(lon);
  const cosPhi = Math.cos(phi);
  return [cosPhi * Math.cos(lambda), cosPhi * Math.sin(lambda), Math.sin(phi)];
}

function toCoordinates([x, y, z]: Vector3): [number, number] {
  const hyp = Math.hypot(x, y);
  const lat = toDegrees(Math.atan2(z, hyp));
  const lon = toDegrees(Math.atan2(y, x));
  return [lon, lat];
}

function dot(a: Vector3, b: Vector3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function interpolateVector(a: Vector3, b: Vector3, fraction: number): Vector3 {
  const clampedDot = Math.min(1, Math.max(-1, dot(a, b)));
  const omega = Math.acos(clampedDot);
  const sinOmega = Math.sin(omega);

  if (sinOmega < 1e-9) {
    return [
      a[0] + (b[0] - a[0]) * fraction,
      a[1] + (b[1] - a[1]) * fraction,
      a[2] + (b[2] - a[2]) * fraction
    ];
  }

  const startScale = Math.sin((1 - fraction) * omega) / sinOmega;
  const endScale = Math.sin(fraction * omega) / sinOmega;

  return [
    startScale * a[0] + endScale * b[0],
    startScale * a[1] + endScale * b[1],
    startScale * a[2] + endScale * b[2]
  ];
}

export function createGreatCircleCoordinates(
  start: Coordinates,
  end: Coordinates = KAABA,
  points = 112
): [number, number][] {
  const safePoints = Math.max(2, Math.floor(points));
  const startVector = toVector(start);
  const endVector = toVector(end);

  return Array.from({ length: safePoints }, (_, index) => {
    const fraction = index / (safePoints - 1);
    return toCoordinates(interpolateVector(startVector, endVector, fraction));
  });
}

export function createQiblaLineFeature(start: Coordinates): Feature<LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: createGreatCircleCoordinates(start)
    }
  };
}

export function createQiblaLineCollection(start: Coordinates): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: [createQiblaLineFeature(start)]
  };
}

