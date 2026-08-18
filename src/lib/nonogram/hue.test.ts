import { describe, it, expect } from "vitest";
import { HUES, tileHue } from "./hue";

describe("tileHue", () => {
  it("assigns the first hue to index 0", () => {
    expect(tileHue(0)).toBe(HUES[0]);
  });

  it("assigns a different hue to each index within one 9-tile chapter", () => {
    const assigned = new Set(Array.from({ length: 9 }, (_, i) => tileHue(i)));
    expect(assigned.size).toBeGreaterThan(1);
  });

  it("wraps around once the index exceeds the hue count", () => {
    expect(tileHue(HUES.length)).toBe(tileHue(0));
  });
});
