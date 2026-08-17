export function runLengths(line: number[]): number[] {
  const runs: number[] = [];
  let current = 0;
  for (const cell of line) {
    if (cell === 1) {
      current++;
    } else if (current > 0) {
      runs.push(current);
      current = 0;
    }
  }
  if (current > 0) runs.push(current);
  return runs.length > 0 ? runs : [0];
}

export function deriveRowClues(solution: number[][]): number[][] {
  return solution.map((row) => runLengths(row));
}

export function deriveColClues(solution: number[][]): number[][] {
  const cols = solution[0].length;
  const colClues: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const column = solution.map((row) => row[c]);
    colClues.push(runLengths(column));
  }
  return colClues;
}

export function cluesEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
