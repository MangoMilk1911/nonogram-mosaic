import { describe, it, expect } from "vitest";
import { upsertCustomPuzzle, removeCustomPuzzle } from "./customPuzzles";
import type { CustomPuzzle } from "../nonogram/types";

const puzzleA: CustomPuzzle = {
  id: "custom-a",
  title: "A",
  size: { rows: 2, cols: 2 },
  solution: [
    [0, 1],
    [1, 0],
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
};
const puzzleB: CustomPuzzle = {
  id: "custom-b",
  title: "B",
  size: { rows: 2, cols: 2 },
  solution: [
    [1, 1],
    [0, 0],
  ],
  createdAt: "2026-01-02T00:00:00.000Z",
};

describe("upsertCustomPuzzle", () => {
  it("appends a puzzle with a new id", () => {
    expect(upsertCustomPuzzle([puzzleA], puzzleB)).toEqual([puzzleA, puzzleB]);
  });

  it("replaces an existing puzzle with the same id in place", () => {
    const updatedA: CustomPuzzle = { ...puzzleA, title: "A renamed" };
    expect(upsertCustomPuzzle([puzzleA, puzzleB], updatedA)).toEqual([updatedA, puzzleB]);
  });
});

describe("removeCustomPuzzle", () => {
  it("removes the puzzle with the matching id", () => {
    expect(removeCustomPuzzle([puzzleA, puzzleB], "custom-a")).toEqual([puzzleB]);
  });

  it("is a no-op when the id isn't present", () => {
    expect(removeCustomPuzzle([puzzleA], "custom-nope")).toEqual([puzzleA]);
  });
});
