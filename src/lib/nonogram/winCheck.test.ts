import { describe, it, expect } from "vitest";
import { checkWin } from "./winCheck";
import type { CellState } from "./types";

const solution = [
  [1, 1, 0],
  [0, 0, 1],
];

describe("checkWin", () => {
  it("wins on an exact match", () => {
    const cells: CellState[][] = [
      [1, 1, 0],
      [0, 0, 1],
    ];
    expect(checkWin(cells, solution)).toBe(true);
  });

  it("does not win on a partial fill", () => {
    const cells: CellState[][] = [
      [1, 0, 0],
      [0, 0, 1],
    ];
    expect(checkWin(cells, solution)).toBe(false);
  });

  it("ignores X-marks (state 2) — they never count as filled", () => {
    const cells: CellState[][] = [
      [1, 1, 2],
      [2, 2, 1],
    ];
    expect(checkWin(cells, solution)).toBe(true);
  });

  it("does not win when an extra cell is filled", () => {
    const cells: CellState[][] = [
      [1, 1, 1],
      [0, 0, 1],
    ];
    expect(checkWin(cells, solution)).toBe(false);
  });
});
