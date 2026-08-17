// One-time content-authoring tool: draws the three chapter mosaic pictures
// as full-size binary grids (via simple geometric formulas so the shapes
// are exact and symmetric), then slices each into 9 puzzle tiles and writes
// the puzzle + chapter JSON files consumed by the app. Not imported by the
// app itself — run once with `node scripts/generate-puzzles.mjs` from the
// repo root whenever content needs to be regenerated.
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

function heart(n) {
  const grid = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = ((c + 0.5) / n) * 2.6 - 1.3;
      const y = 1.35 - ((r + 0.5) / n) * 2.6;
      const val = Math.pow(x * x + y * y - 1, 3) - x * x * Math.pow(y, 3);
      grid[r][c] = val <= 0 ? 1 : 0;
    }
  }
  return grid;
}

function star(n) {
  const cx = n / 2, cy = n / 2;
  const rOut = n * 0.48, rIn = rOut * 0.382;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? rOut : rIn;
    pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  function inside(px, py) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        c = !c;
      }
    }
    return c;
  }
  const grid = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      grid[r][c] = inside(c + 0.5, r + 0.5) ? 1 : 0;
    }
  }
  // Small sparkle marks in the empty top corners so every sliced tile has
  // at least some fill (avoids degenerate all-empty puzzles).
  const sparkle = (sr, sc) => {
    grid[sr][sc] = 1;
    grid[sr - 1][sc] = 1;
    grid[sr + 1][sc] = 1;
    grid[sr][sc - 1] = 1;
    grid[sr][sc + 1] = 1;
  };
  sparkle(4, 4);
  sparkle(4, n - 5);
  return grid;
}

function flower(n) {
  const cx = n / 2, cy = n / 2;
  const centerR = n * 0.14;
  const petalR = n * 0.15;
  const petalDist = n * 0.26;
  const petalCount = 8;
  const centers = [[cx, cy, centerR]];
  for (let i = 0; i < petalCount; i++) {
    const ang = (i * 2 * Math.PI) / petalCount - Math.PI / 2;
    centers.push([cx + petalDist * Math.cos(ang), cy + petalDist * Math.sin(ang), petalR]);
  }
  const grid = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = c + 0.5, y = r + 0.5;
      let fill = 0;
      for (const [px, py, rad] of centers) {
        if (Math.hypot(x - px, y - py) <= rad) { fill = 1; break; }
      }
      grid[r][c] = fill;
    }
  }
  return grid;
}

const chapterDefs = [
  { id: "ch1", title: "Chapter 1: Heart", size: 24, image: heart },
  { id: "ch2", title: "Chapter 2: Star", size: 30, image: star },
  { id: "ch3", title: "Chapter 3: Flower", size: 36, image: flower },
];

function formatPuzzle(puzzle) {
  const rows = puzzle.solution.map((row) => `    [${row.join(",")}]`).join(",\n");
  return `{
  "id": "${puzzle.id}",
  "size": { "rows": ${puzzle.size.rows}, "cols": ${puzzle.size.cols} },
  "solution": [\n${rows}\n  ]
}\n`;
}

function formatChapter(chapter) {
  const tiles = chapter.tiles.map((t) => `    "${t}"`).join(",\n");
  return `{
  "id": "${chapter.id}",
  "title": "${chapter.title}",
  "mosaicSize": { "rows": 3, "cols": 3 },
  "tiles": [\n${tiles}\n  ]
}\n`;
}

const puzzlesRoot = join("src", "data", "puzzles");
const chaptersRoot = join("src", "data", "chapters");
mkdirSync(chaptersRoot, { recursive: true });

for (const ch of chapterDefs) {
  const full = ch.image(ch.size);
  const tileSize = ch.size / 3;
  const tiles = [];
  const chapterDir = join(puzzlesRoot, ch.id);
  mkdirSync(chapterDir, { recursive: true });

  let idx = 0;
  for (let tr = 0; tr < 3; tr++) {
    for (let tc = 0; tc < 3; tc++) {
      idx++;
      const solution = [];
      for (let r = 0; r < tileSize; r++) {
        const row = [];
        for (let c = 0; c < tileSize; c++) {
          row.push(full[tr * tileSize + r][tc * tileSize + c]);
        }
        solution.push(row);
      }
      const id = `${ch.id}-p${idx}`;
      tiles.push(id);
      writeFileSync(
        join(chapterDir, `${id}.json`),
        formatPuzzle({ id, size: { rows: tileSize, cols: tileSize }, solution })
      );
    }
  }

  writeFileSync(join(chaptersRoot, `${ch.id}.json`), formatChapter({ ...ch, tiles }));
  console.log(`Wrote ${ch.id}: ${tiles.length} puzzles, ${tileSize}x${tileSize} each`);
}
