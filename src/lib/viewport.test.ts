import { describe, expect, it } from "vitest";
import { isPointInView, locationZoom } from "./viewport";

const size = { width: 390, height: 844 };
const insets = { top: 62, right: 0, bottom: 232, left: 0 };

describe("isPointInView", () => {
  it("accepts a point in the uncovered map area", () => {
    expect(isPointInView({ x: 195, y: 300 }, size, insets)).toBe(true);
  });

  it("rejects a point hidden under the control sheet or status pill", () => {
    expect(isPointInView({ x: 195, y: 700 }, size, insets)).toBe(false);
    expect(isPointInView({ x: 195, y: 40 }, size, insets)).toBe(false);
  });

  it("rejects a point off-screen", () => {
    expect(isPointInView({ x: -20, y: 300 }, size, insets)).toBe(false);
    expect(isPointInView({ x: 1049, y: -626 }, size, insets)).toBe(false);
  });
});

describe("locationZoom", () => {
  it("zooms to street level for a precise fix and wider for a coarse one", () => {
    const fix = { label: "My location", lat: 0, lon: 0, source: "geolocation" as const };

    expect(locationZoom({ ...fix, accuracy: 12 })).toBe(17);
    expect(locationZoom({ ...fix, accuracy: 180 })).toBe(16);
    expect(locationZoom({ ...fix, accuracy: 900 })).toBe(15);
    expect(locationZoom({ ...fix, accuracy: 5000 })).toBe(13);
  });

  it("uses city zoom for cities", () => {
    expect(locationZoom({ label: "Karachi, Pakistan", lat: 24.86, lon: 67.01, source: "city" })).toBe(13);
  });
});
