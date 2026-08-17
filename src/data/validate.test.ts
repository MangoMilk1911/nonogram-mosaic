import { describe, it, expect } from "vitest";
import { puzzles } from "./puzzles";
import { chapters } from "./chapters";

describe("puzzle data validation", () => {
  it("every puzzle solution matches its declared size", () => {
    expect(Object.keys(puzzles).length).toBeGreaterThan(0);
    for (const puzzle of Object.values(puzzles)) {
      expect(puzzle.solution.length).toBe(puzzle.size.rows);
      for (const row of puzzle.solution) {
        expect(row.length).toBe(puzzle.size.cols);
      }
    }
  });

  it("no puzzle is degenerate (completely empty)", () => {
    for (const puzzle of Object.values(puzzles)) {
      const flat = puzzle.solution.flat();
      expect(flat.some((cell) => cell === 1)).toBe(true);
    }
  });

  it("every chapter has exactly 9 tiles, each referencing an existing puzzle", () => {
    expect(chapters.length).toBe(3);
    for (const chapter of chapters) {
      expect(chapter.tiles.length).toBe(9);
      expect(chapter.mosaicSize).toEqual({ rows: 3, cols: 3 });
      for (const tileId of chapter.tiles) {
        expect(puzzles[tileId]).toBeDefined();
      }
    }
  });
});
