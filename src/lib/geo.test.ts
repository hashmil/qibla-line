import { describe, expect, it } from "vitest";
import { createGreatCircleCoordinates } from "./geo";
import { KAABA } from "./qibla";

describe("createGreatCircleCoordinates", () => {
  it("starts at the user and ends at the Kaaba", () => {
    const coordinates = createGreatCircleCoordinates({ lat: 51.5072, lon: -0.1276 });

    expect(coordinates[0]![0]).toBeCloseTo(-0.1276, 4);
    expect(coordinates[0]![1]).toBeCloseTo(51.5072, 4);
    expect(coordinates.at(-1)![0]).toBeCloseTo(KAABA.lon, 4);
    expect(coordinates.at(-1)![1]).toBeCloseTo(KAABA.lat, 4);
  });

  it("keeps longitudes continuous across the antimeridian", () => {
    const coordinates = createGreatCircleCoordinates({ lat: 21.3069, lon: -157.8583 });

    for (let index = 1; index < coordinates.length; index += 1) {
      expect(Math.abs(coordinates[index]![0] - coordinates[index - 1]![0])).toBeLessThan(180);
    }
    // From Honolulu the path heads west over ±180, so the Kaaba end is one world copy along
    expect(coordinates.at(-1)![0]).toBeCloseTo(KAABA.lon - 360, 4);
  });
});
