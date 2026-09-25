import { describe, expect, it } from "vitest";
import { createTurnTracker, headingAfterTurn, isRoughlyFlat } from "./gyro";

describe("createTurnTracker", () => {
  it("accumulates small turns across the 0/360 seam", () => {
    const tracker = createTurnTracker();
    tracker.update(10);
    tracker.update(355);
    expect(tracker.update(340)).toBeCloseTo(-30);
  });

  it("keeps counting past a full turn", () => {
    const tracker = createTurnTracker();
    let total = 0;
    for (let alpha = 0; alpha <= 400; alpha += 20) total = tracker.update(alpha % 360);
    expect(total).toBeCloseTo(400);
  });
});

describe("headingAfterTurn", () => {
  it("turning clockwise (alpha falling) raises the heading", () => {
    expect(headingAfterTurn(246.7, -11.5)).toBeCloseTo(258.2);
  });

  it("wraps below zero", () => {
    expect(headingAfterTurn(5, 20)).toBeCloseTo(345);
  });
});

describe("isRoughlyFlat", () => {
  it("accepts a phone held flat and rejects one held upright", () => {
    expect(isRoughlyFlat(10, -5)).toBe(true);
    expect(isRoughlyFlat(80, 0)).toBe(false);
  });
});
