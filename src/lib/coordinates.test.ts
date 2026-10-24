import { describe, expect, it } from "vitest";
import { parseCoordinate } from "./coordinates";

describe("parseCoordinate", () => {
  it("reads plain and signed decimals", () => {
    expect(parseCoordinate("25.2048", "N", "S")).toBe(25.2048);
    expect(parseCoordinate("-33.8688", "N", "S")).toBe(-33.8688);
    expect(parseCoordinate("+55", "E", "W")).toBe(55);
  });

  it("accepts a decimal comma and a degree sign", () => {
    expect(parseCoordinate("25,2048", "N", "S")).toBe(25.2048);
    expect(parseCoordinate("25.2048°", "N", "S")).toBe(25.2048);
  });

  it("reads hemisphere letters either side", () => {
    expect(parseCoordinate("33.8688 S", "N", "S")).toBe(-33.8688);
    expect(parseCoordinate("s 33.8688", "N", "S")).toBe(-33.8688);
    expect(parseCoordinate("151.2093 E", "E", "W")).toBe(151.2093);
    expect(parseCoordinate("0.1276W", "E", "W")).toBe(-0.1276);
  });

  it("rejects the wrong axis, doubled signs and stray forms", () => {
    expect(parseCoordinate("25 E", "N", "S")).toBeNull();
    expect(parseCoordinate("-25 S", "N", "S")).toBeNull();
    expect(parseCoordinate("0x10", "N", "S")).toBeNull();
    expect(parseCoordinate("1e1", "N", "S")).toBeNull();
    expect(parseCoordinate("", "N", "S")).toBeNull();
    expect(parseCoordinate("abc", "N", "S")).toBeNull();
  });
});
