import { describe, expect, it } from "vitest";
import { calculateQiblaBearing, calculateDistanceKm, KAABA } from "./qibla";
import { createGreatCircleCoordinates } from "./geo";

describe("calculateQiblaBearing", () => {
  it.each([
    ["Dubai city centre", { lat: 25.2048, lon: 55.2708 }, 258.2],
    ["Abu Dhabi", { lat: 24.4539, lon: 54.3773 }, 260.2],
    ["London", { lat: 51.5074, lon: -0.1278 }, 119.0],
    ["Colombo", { lat: 6.9271, lon: 79.8612 }, 294.8]
  ])("%s gives the expected true bearing", (_name, coordinates, expected) => {
    expect(calculateQiblaBearing(coordinates)).toBeCloseTo(expected, 0);
  });

  it("calculates a positive distance to the Kaaba", () => {
    expect(calculateDistanceKm({ lat: 25.2048, lon: 55.2708 })).toBeGreaterThan(1500);
  });
});

describe("createGreatCircleCoordinates", () => {
  it("returns a robust LineString coordinate set", () => {
    const coordinates = createGreatCircleCoordinates({ lat: 25.2048, lon: 55.2708 }, KAABA, 112);
    const first = coordinates[0];
    const last = coordinates.at(-1);

    expect(coordinates).toHaveLength(112);
    expect(first).toBeDefined();
    expect(last).toBeDefined();
    expect(first?.[0]).toBeCloseTo(55.2708, 6);
    expect(first?.[1]).toBeCloseTo(25.2048, 6);
    expect(last?.[0]).toBeCloseTo(KAABA.lon, 6);
    expect(last?.[1]).toBeCloseTo(KAABA.lat, 6);
  });
});
