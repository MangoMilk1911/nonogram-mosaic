import type { CellState } from "./types";

export function checkWin(cells: CellState[][], solution: number[][]): boolean {
  return solution.every((row, r) =>
    row.every((value, c) => (cells[r][c] === 1 ? 1 : 0) === value)
  );
}
