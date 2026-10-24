import { describe, expect, it } from "vitest";
import { getCompassReading } from "./compass";

describe("getCompassReading", () => {
  it("prefers iOS webkit compass heading when available", () => {
    const reading = getCompassReading({
      webkitCompassHeading: 258.4,
      webkitCompassAccuracy: 7,
      alpha: 10
    } as unknown as DeviceOrientationEvent);

    expect(reading?.heading).toBeCloseTo(258.4, 1);
    expect(reading?.accuracy).toBe(7);
    expect(reading?.source).toBe("webkit");
  });

  it("normalises absolute alpha heading", () => {
    const reading = getCompassReading({
      alpha: 90,
      absolute: true
    } as unknown as DeviceOrientationEvent);

    expect(reading?.heading).toBe(270);
    expect(reading?.source).toBe("absolute");
  });

  it("drops negative iOS accuracy, which means uncalibrated", () => {
    const reading = getCompassReading({
      webkitCompassHeading: 12,
      webkitCompassAccuracy: -1
    } as unknown as DeviceOrientationEvent);

    expect(reading?.accuracy).toBeUndefined();
  });

  it("ignores non-finite headings", () => {
    expect(getCompassReading({ webkitCompassHeading: Number.NaN } as unknown as DeviceOrientationEvent)).toBeNull();
    expect(getCompassReading({ alpha: Number.NaN, absolute: true } as unknown as DeviceOrientationEvent)).toBeNull();
  });
});
