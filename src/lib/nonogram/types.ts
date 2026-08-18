// 0 = empty, 1 = filled, 2 = marked with an X (player note only)
export type CellState = 0 | 1 | 2;

export interface Puzzle {
  id: string;
  size: { rows: number; cols: number };
  solution: number[][];
}

export interface CustomPuzzle {
  id: string;
  title: string;
  size: { rows: number; cols: number };
  solution: number[][];
  createdAt: string;
}

export interface Chapter {
  id: string;
  title: string;
  mosaicSize: { rows: number; cols: number };
  tiles: string[];
}

export interface Progress {
  completed: string[];
}
