import type { Puzzle } from "../lib/nonogram/types";

const modules = import.meta.glob<Puzzle>("./puzzles/**/*.json", {
  eager: true,
  import: "default",
});

export const puzzles: Record<string, Puzzle> = {};
for (const puzzle of Object.values(modules)) {
  puzzles[puzzle.id] = puzzle;
}
