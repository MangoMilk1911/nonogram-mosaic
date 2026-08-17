# Nonogram Mosaic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Nonogram Mosaic desktop game — a Tauri + Svelte
puzzle game with 27 hand-authored nonogram puzzles across 3 chapters, a
mosaic-reveal meta-progression hook, and local save persistence — exactly as
described in the design spec.

**Architecture:** A plain Vite + Svelte 5 single-page app (no SvelteKit, no
router — a single writable `currentView` store swaps between three screens)
wrapped in a Tauri 2 shell for native packaging and local file persistence.
Puzzle/chapter content is static JSON bundled at build time; row/column
clues are always derived at load time from each puzzle's `solution` grid via
run-length encoding, never stored separately.

**Tech Stack:** Vite 8, Svelte 5 (TypeScript), Tauri 2, `@tauri-apps/plugin-fs`
for local save persistence, Vitest for unit tests. Package manager: npm.

**Spec:** [docs/superpowers/specs/2026-08-17-nonogram-mosaic-design.md](../specs/2026-08-17-nonogram-mosaic-design.md)

## Global Constraints

- Single-color fill only — no color-matching variant, no procedural puzzle
  generation at runtime, no level editor UI, no network calls of any kind.
- Puzzle grids are at most 15x15 (spec's stated UI ceiling).
- `solution` is the only stored truth for a puzzle; row/column clues are
  always derived from it at load time (via run-length encoding), never
  hand-entered or persisted separately.
- Progress persistence is a single JSON file (`progress.json`) in Tauri's
  app-local-data directory, containing only `{ "completed": string[] }`.
  Chapter completion, mosaic-reveal state, and chapter-unlock state are
  always derived from that one list — never stored redundantly.
- On any read/parse failure of the save file (missing on first run, or
  corrupted), fall back to an empty progress state rather than crashing.
- X-marks are player notes only and never affect win-checking.
- **Environment note for whoever executes this plan on this machine:** Rust
  build commands (`cargo`, `npx tauri ...`, `rustc`) must be run via the
  PowerShell tool, not the Bash tool — Git Bash's own `/usr/bin/link.exe`
  (a coreutils tool, unrelated to the MSVC linker) shadows the real linker
  on Bash's PATH and silently breaks every Rust build with a confusing
  "extra operand" error. Frontend-only commands (`npm`, `node`, `vitest`)
  are fine in either shell.

---

## Task 1: Project scaffolding — Vite+Svelte shell, Tauri, fs plugin, Vitest

**Files:**
- Create: entire Vite+Svelte project at repo root (`package.json`,
  `src/main.ts`, `src/App.svelte`, `vite.config.ts`, `tsconfig*.json`, etc.)
- Create: `src-tauri/` (Tauri Rust shell, via `tauri init`)
- Modify: `vite.config.ts` (Tauri-required dev-server settings)
- Modify: `src-tauri/tauri.conf.json` (identifier, product name, window size)
- Modify: `src-tauri/Cargo.toml` (add `tauri-plugin-fs`)
- Modify: `src-tauri/src/lib.rs` (register the fs plugin)
- Modify: `src-tauri/capabilities/default.json` (scope fs access to
  app-local-data)
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script, vitest devDependency)
- Create: `.gitignore` additions for `node_modules/`, `dist/`,
  `src-tauri/target/`

**Interfaces:**
- Produces: a working `npm run dev` (Vite dev server), `npm run build`
  (frontend build), `npm run test` (Vitest), and `npm run tauri build`
  (native app) pipeline that every later task builds on.

- [ ] **Step 1: Scaffold a plain Vite + Svelte-TS project without touching `docs/`**

The repo root already contains a committed `docs/` folder, so `create-vite`
can't target `.` directly (it refuses to scaffold into a non-empty
directory without deleting existing files). Scaffold into a throwaway
subdirectory, then move the generated files up:

```bash
npm create vite@latest .tmp-scaffold -- --template svelte-ts
shopt -s dotglob
mv .tmp-scaffold/* .
shopt -u dotglob
rmdir .tmp-scaffold
npm install
```

- [ ] **Step 2: Verify the frontend builds**

Run: `npm run build`
Expected: Vite build completes, producing a `dist/` folder, no errors.

- [ ] **Step 3: Add the Tauri CLI and initialize the Rust shell**

```bash
npm install --save-dev @tauri-apps/cli@latest
npx tauri init --ci --app-name nonogram-mosaic --window-title "Nonogram Mosaic" --frontend-dist ../dist --dev-url http://localhost:1420 --before-dev-command "npm run dev" --before-build-command "npm run build"
```

This creates `src-tauri/` with `Cargo.toml`, `tauri.conf.json`, `src/lib.rs`,
`src/main.rs`, `capabilities/default.json`, and placeholder app icons.

- [ ] **Step 4: Set the app identifier and window size**

Edit `src-tauri/tauri.conf.json` — replace the placeholder `identifier` and
tune the window block:

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/config.schema.json",
  "productName": "nonogram-mosaic",
  "version": "0.1.0",
  "identifier": "com.nonogrammosaic.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "Nonogram Mosaic",
        "width": 1000,
        "height": 750,
        "minWidth": 700,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

- [ ] **Step 5: Add the Tauri-required Vite dev-server settings**

Replace `vite.config.ts` with:

```ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig(async () => ({
  plugins: [svelte()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

- [ ] **Step 6: Add the fs plugin (Rust side) for local save persistence**

Run (PowerShell, per the Global Constraints note above):

```powershell
cd src-tauri
cargo add tauri-plugin-fs
cd ..
```

- [ ] **Step 7: Register the fs plugin in the Rust shell**

Edit `src-tauri/src/lib.rs` to add `.plugin(tauri_plugin_fs::init())` before
`.run(...)`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

- [ ] **Step 8: Add the fs plugin (JS side) and scope its permissions**

```bash
npm install @tauri-apps/plugin-fs @tauri-apps/api@latest
```

Replace `src-tauri/capabilities/default.json` with:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "enables the default permissions",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:allow-mkdir",
    "fs:allow-exists",
    {
      "identifier": "fs:scope",
      "allow": [{ "path": "$APPLOCALDATA" }, { "path": "$APPLOCALDATA/**/*" }]
    }
  ]
}
```

- [ ] **Step 9: Add Vitest**

```bash
npm install --save-dev vitest
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: "node",
  },
});
```

Add a `test` script to `package.json`'s `"scripts"` block:

```json
"test": "vitest run"
```

- [ ] **Step 10: Verify the full toolchain**

Run: `npm run test` — expected: passes with "no test files found" (none
written yet).
Run: `npm run build` — expected: succeeds.
Run (PowerShell): `cd src-tauri; cargo check; cd ..` — expected: compiles
cleanly (this is the first Rust compile and will take several minutes).

- [ ] **Step 11: Ignore build artifacts and commit**

Ensure `.gitignore` includes `node_modules/`, `dist/`, and
`src-tauri/target/` (the Vite template's default `.gitignore` already
covers `node_modules/` and `dist/`; add `src-tauri/target/` if missing).

```bash
git add -A
git commit -m "Scaffold Vite+Svelte+Tauri project with fs plugin and Vitest"
```

---

## Task 2: Clue derivation (run-length encoding)

**Files:**
- Create: `src/lib/nonogram/types.ts`
- Create: `src/lib/nonogram/clues.ts`
- Test: `src/lib/nonogram/clues.test.ts`

**Interfaces:**
- Produces: `runLengths(line: number[]): number[]`,
  `deriveRowClues(solution: number[][]): number[][]`,
  `deriveColClues(solution: number[][]): number[][]`,
  `cluesEqual(a: number[], b: number[]): boolean`, and the shared types
  `CellState`, `Puzzle`, `Chapter`, `Progress` — every later task imports
  these from `src/lib/nonogram/types.ts` and `src/lib/nonogram/clues.ts`.

- [ ] **Step 1: Write the shared types**

Create `src/lib/nonogram/types.ts`:

```ts
// 0 = empty, 1 = filled, 2 = marked with an X (player note only)
export type CellState = 0 | 1 | 2;

export interface Puzzle {
  id: string;
  size: { rows: number; cols: number };
  solution: number[][];
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
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/nonogram/clues.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { runLengths, deriveRowClues, deriveColClues, cluesEqual } from "./clues";

describe("runLengths", () => {
  it("encodes a single run", () => {
    expect(runLengths([0, 1, 1, 1, 0])).toEqual([3]);
  });

  it("encodes multiple runs", () => {
    expect(runLengths([1, 1, 0, 1, 0, 0, 1])).toEqual([2, 1, 1]);
  });

  it("encodes an empty line as [0]", () => {
    expect(runLengths([0, 0, 0, 0])).toEqual([0]);
  });

  it("encodes a fully-filled line as a single run", () => {
    expect(runLengths([1, 1, 1, 1])).toEqual([4]);
  });

  it("encodes a run touching the end of the line", () => {
    expect(runLengths([0, 0, 1, 1])).toEqual([2]);
  });
});

describe("deriveRowClues", () => {
  it("derives one clue array per row", () => {
    const solution = [
      [1, 1, 0],
      [0, 0, 0],
      [1, 0, 1],
    ];
    expect(deriveRowClues(solution)).toEqual([[2], [0], [1, 1]]);
  });
});

describe("deriveColClues", () => {
  it("derives one clue array per column", () => {
    const solution = [
      [1, 1, 0],
      [0, 0, 0],
      [1, 0, 1],
    ];
    expect(deriveColClues(solution)).toEqual([[1, 1], [1], [1]]);
  });
});

describe("cluesEqual", () => {
  it("is true for identical arrays", () => {
    expect(cluesEqual([2, 1], [2, 1])).toBe(true);
  });

  it("is false for different lengths or values", () => {
    expect(cluesEqual([2, 1], [2])).toBe(false);
    expect(cluesEqual([2, 1], [2, 2])).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm run test`
Expected: FAIL — `./clues` module does not exist yet.

- [ ] **Step 4: Implement clue derivation**

Create `src/lib/nonogram/clues.ts`:

```ts
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
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm run test`
Expected: PASS — all `clues.test.ts` cases green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/nonogram/types.ts src/lib/nonogram/clues.ts src/lib/nonogram/clues.test.ts
git commit -m "Add nonogram types and run-length-encoded clue derivation"
```

---

## Task 3: Win-check and chapter-status logic

**Files:**
- Create: `src/lib/nonogram/winCheck.ts`
- Test: `src/lib/nonogram/winCheck.test.ts`
- Create: `src/lib/nonogram/chapterStatus.ts`
- Test: `src/lib/nonogram/chapterStatus.test.ts`

**Interfaces:**
- Consumes: `CellState`, `Puzzle`, `Chapter` from
  `src/lib/nonogram/types.ts` (Task 2).
- Produces: `checkWin(cells: CellState[][], solution: number[][]): boolean`,
  `isChapterComplete(chapter: Chapter, completed: string[]): boolean`,
  `isChapterUnlocked(chapterIndex: number, chapters: Chapter[], completed: string[]): boolean`
  — the puzzle view (Task 8) and chapter-select view (Task 7) both import
  these.

- [ ] **Step 1: Write the failing win-check tests**

Create `src/lib/nonogram/winCheck.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { checkWin } from "./winCheck";

const solution = [
  [1, 1, 0],
  [0, 0, 1],
];

describe("checkWin", () => {
  it("wins on an exact match", () => {
    const cells = [
      [1, 1, 0],
      [0, 0, 1],
    ];
    expect(checkWin(cells, solution)).toBe(true);
  });

  it("does not win on a partial fill", () => {
    const cells = [
      [1, 0, 0],
      [0, 0, 1],
    ];
    expect(checkWin(cells, solution)).toBe(false);
  });

  it("ignores X-marks (state 2) — they never count as filled", () => {
    const cells = [
      [1, 1, 2],
      [2, 2, 1],
    ];
    expect(checkWin(cells, solution)).toBe(true);
  });

  it("does not win when an extra cell is filled", () => {
    const cells = [
      [1, 1, 1],
      [0, 0, 1],
    ];
    expect(checkWin(cells, solution)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm run test`
Expected: FAIL — `./winCheck` module does not exist yet.

- [ ] **Step 3: Implement win-check**

Create `src/lib/nonogram/winCheck.ts`:

```ts
import type { CellState } from "./types";

export function checkWin(cells: CellState[][], solution: number[][]): boolean {
  return solution.every((row, r) =>
    row.every((value, c) => (cells[r][c] === 1 ? 1 : 0) === value)
  );
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Write the failing chapter-status tests**

Create `src/lib/nonogram/chapterStatus.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isChapterComplete, isChapterUnlocked } from "./chapterStatus";
import type { Chapter } from "./types";

const ch1: Chapter = {
  id: "ch1",
  title: "Chapter 1",
  mosaicSize: { rows: 3, cols: 3 },
  tiles: ["ch1-p1", "ch1-p2", "ch1-p3"],
};
const ch2: Chapter = {
  id: "ch2",
  title: "Chapter 2",
  mosaicSize: { rows: 3, cols: 3 },
  tiles: ["ch2-p1", "ch2-p2", "ch2-p3"],
};
const chapters = [ch1, ch2];

describe("isChapterComplete", () => {
  it("is true only when every tile id is in completed", () => {
    expect(isChapterComplete(ch1, ["ch1-p1", "ch1-p2", "ch1-p3"])).toBe(true);
    expect(isChapterComplete(ch1, ["ch1-p1", "ch1-p2"])).toBe(false);
  });
});

describe("isChapterUnlocked", () => {
  it("the first chapter is always unlocked", () => {
    expect(isChapterUnlocked(0, chapters, [])).toBe(true);
  });

  it("a later chapter unlocks only once the previous one is complete", () => {
    expect(isChapterUnlocked(1, chapters, [])).toBe(false);
    expect(isChapterUnlocked(1, chapters, ["ch1-p1", "ch1-p2", "ch1-p3"])).toBe(true);
  });
});
```

- [ ] **Step 6: Run the tests and confirm they fail**

Run: `npm run test`
Expected: FAIL — `./chapterStatus` module does not exist yet.

- [ ] **Step 7: Implement chapter-status helpers**

Create `src/lib/nonogram/chapterStatus.ts`:

```ts
import type { Chapter } from "./types";

export function isChapterComplete(chapter: Chapter, completed: string[]): boolean {
  return chapter.tiles.every((id) => completed.includes(id));
}

export function isChapterUnlocked(
  chapterIndex: number,
  chapters: Chapter[],
  completed: string[]
): boolean {
  if (chapterIndex === 0) return true;
  return isChapterComplete(chapters[chapterIndex - 1], completed);
}
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `npm run test`
Expected: PASS — all tests across the project green.

- [ ] **Step 9: Commit**

```bash
git add src/lib/nonogram/winCheck.ts src/lib/nonogram/winCheck.test.ts src/lib/nonogram/chapterStatus.ts src/lib/nonogram/chapterStatus.test.ts
git commit -m "Add win-check and chapter completion/unlock logic"
```

---

## Task 4: Puzzle & chapter content (27 puzzles, 3 chapters)

**Files:**
- Create: `scripts/generate-puzzles.mjs` (one-time content-authoring tool —
  not imported by the app)
- Create: `src/data/puzzles/ch1/ch1-p1.json` … `ch1-p9.json` (8x8 each)
- Create: `src/data/puzzles/ch2/ch2-p1.json` … `ch2-p9.json` (10x10 each)
- Create: `src/data/puzzles/ch3/ch3-p1.json` … `ch3-p9.json` (12x12 each)
- Create: `src/data/chapters/ch1.json`, `ch2.json`, `ch3.json`
- Create: `src/data/puzzles.ts` (loader)
- Create: `src/data/chapters.ts` (loader)
- Test: `src/data/validate.test.ts`

**Interfaces:**
- Consumes: `Puzzle`, `Chapter` types from `src/lib/nonogram/types.ts`.
- Produces: `puzzles: Record<string, Puzzle>` (keyed by puzzle id) and
  `chapters: Chapter[]` (sorted by id) — every UI component (Tasks 6-9)
  imports these two.

Each chapter's 9 puzzles are a straight 3x3 slice of one full picture (a
heart for chapter 1, a star for chapter 2, a flower for chapter 3), so that
completing all 9 and viewing the mosaic reveal shows one coherent image.
The picture data below was generated from simple geometric formulas
(an implicit heart curve, a 5-pointed star polygon, 8 overlapping circles
for the flower) specifically so every one of the 27 tiles has been checked
to contain at least one filled cell and at least one empty cell — no
degenerate all-empty or fully-solved-by-default puzzles.

- [ ] **Step 1: Write the failing data-validation test**

Create `src/data/validate.test.ts`:

```ts
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

  it("every puzzle has at least one filled and one empty cell", () => {
    for (const puzzle of Object.values(puzzles)) {
      const flat = puzzle.solution.flat();
      expect(flat.some((cell) => cell === 1)).toBe(true);
      expect(flat.some((cell) => cell === 0)).toBe(true);
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
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm run test`
Expected: FAIL — `./puzzles` and `./chapters` modules don't exist, and no
puzzle content exists yet.

- [ ] **Step 3: Add the content-authoring script**

Create `scripts/generate-puzzles.mjs`:

```js
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
```

- [ ] **Step 4: Run the script to generate the 27 puzzles and 3 chapters**

Run: `node scripts/generate-puzzles.mjs`
Expected output:
```
Wrote ch1: 9 puzzles, 8x8 each
Wrote ch2: 9 puzzles, 10x10 each
Wrote ch3: 9 puzzles, 12x12 each
```
This creates `src/data/puzzles/ch1/ch1-p1.json` … `ch3-p9.json` (27 files)
and `src/data/chapters/ch1.json`, `ch2.json`, `ch3.json`.

- [ ] **Step 5: Write the loaders**

Create `src/data/puzzles.ts`:

```ts
import type { Puzzle } from "../lib/nonogram/types";

const modules = import.meta.glob<Puzzle>("./puzzles/**/*.json", {
  eager: true,
  import: "default",
});

export const puzzles: Record<string, Puzzle> = {};
for (const puzzle of Object.values(modules)) {
  puzzles[puzzle.id] = puzzle;
}
```

Create `src/data/chapters.ts`:

```ts
import type { Chapter } from "../lib/nonogram/types";

const modules = import.meta.glob<Chapter>("./chapters/*.json", {
  eager: true,
  import: "default",
});

export const chapters: Chapter[] = Object.values(modules).sort((a, b) =>
  a.id.localeCompare(b.id)
);
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `npm run test`
Expected: PASS — all data-validation cases green, plus every earlier test
still green.

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-puzzles.mjs src/data
git commit -m "Add 27 hand-authored puzzles across 3 chapters with validation tests"
```

---

## Task 5: View and progress stores (with Tauri fs persistence)

**Files:**
- Create: `src/lib/stores/view.ts`
- Create: `src/lib/stores/progress.ts`

**Interfaces:**
- Consumes: `Progress` type from `src/lib/nonogram/types.ts` (Task 2);
  `readTextFile`, `writeTextFile`, `mkdir`, `exists` from
  `@tauri-apps/plugin-fs`; `appLocalDataDir`, `join` from
  `@tauri-apps/api/path` (both added in Task 1).
- Produces: `currentView: Writable<'chapterSelect' | 'puzzle' | 'mosaicReveal'>`,
  `activePuzzleId: Writable<string | null>`,
  `activeChapterId: Writable<string | null>`,
  `progress: Writable<Progress>`, `loadProgress(): Promise<void>`,
  `markComplete(puzzleId: string): Promise<void>` — Tasks 7, 8, and 9 all
  import from this pair of files.

This task has no spec-mandated unit tests (the spec's Testing section
scopes automated tests to clue derivation, win-check, and data validation;
persistence correctness is exercised via manual playtesting in Task 10,
per the spec's own error-handling section: on read/parse failure, fall back
to an empty progress state rather than crashing).

- [ ] **Step 1: Write the view store**

Create `src/lib/stores/view.ts`:

```ts
import { writable } from "svelte/store";

export type ViewName = "chapterSelect" | "puzzle" | "mosaicReveal";

export const currentView = writable<ViewName>("chapterSelect");
export const activePuzzleId = writable<string | null>(null);
export const activeChapterId = writable<string | null>(null);
```

- [ ] **Step 2: Write the progress store**

Create `src/lib/stores/progress.ts`:

```ts
import { writable } from "svelte/store";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import type { Progress } from "../nonogram/types";

const PROGRESS_FILE = "progress.json";

export const progress = writable<Progress>({ completed: [] });

async function progressFilePath(): Promise<string> {
  const dir = await appLocalDataDir();
  return join(dir, PROGRESS_FILE);
}

export async function loadProgress(): Promise<void> {
  try {
    const path = await progressFilePath();
    if (!(await exists(path))) {
      progress.set({ completed: [] });
      return;
    }
    const text = await readTextFile(path);
    const parsed = JSON.parse(text);
    progress.set({
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
    });
  } catch {
    progress.set({ completed: [] });
  }
}

export async function markComplete(puzzleId: string): Promise<void> {
  let next: Progress = { completed: [] };
  progress.update((current) => {
    next = current.completed.includes(puzzleId)
      ? current
      : { completed: [...current.completed, puzzleId] };
    return next;
  });
  const dir = await appLocalDataDir();
  await mkdir(dir, { recursive: true });
  const path = await join(dir, PROGRESS_FILE);
  await writeTextFile(path, JSON.stringify(next));
}
```

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stores
git commit -m "Add view and progress stores with Tauri fs persistence"
```

---

## Task 6: MosaicTile component

**Files:**
- Create: `src/lib/components/MosaicTile.svelte`

**Interfaces:**
- Consumes: nothing beyond plain props.
- Produces: a `MosaicTile` component with props `solution: number[][] | null`
  (a completed puzzle's picture, or `null` to show a numbered placeholder),
  `label: number` (1-9, the tile's position), and `cellSize?: number`
  (pixels per grid cell, default 4) — used by both the chapter-select cards
  (Task 7) and the mosaic-reveal screen (Task 9).

- [ ] **Step 1: Write the component**

Create `src/lib/components/MosaicTile.svelte`:

```svelte
<script lang="ts">
  export let solution: number[][] | null;
  export let label: number;
  export let cellSize = 4;
</script>

<div class="mosaic-tile" class:placeholder={!solution}>
  {#if solution}
    <div
      class="tile-grid"
      style="grid-template-columns: repeat({solution[0].length}, {cellSize}px); grid-template-rows: repeat({solution.length}, {cellSize}px);"
    >
      {#each solution as row}
        {#each row as cell}
          <div class="tile-cell" class:filled={cell === 1}></div>
        {/each}
      {/each}
    </div>
  {:else}
    <span class="tile-number">{label}</span>
  {/if}
</div>

<style>
  .mosaic-tile {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0ede6;
    border: 1px solid #d8d2c4;
    aspect-ratio: 1;
  }
  .mosaic-tile.placeholder {
    color: #a89f8c;
    font-weight: 600;
  }
  .tile-grid {
    display: grid;
  }
  .tile-cell.filled {
    background: #2b2b2b;
  }
  .tile-number {
    font-size: 1.1rem;
  }
</style>
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/MosaicTile.svelte
git commit -m "Add MosaicTile component for rendering mini nonogram pictures"
```

---

## Task 7: Chapter Select view

**Files:**
- Create: `src/lib/components/ChapterSelect.svelte`

**Interfaces:**
- Consumes: `chapters` from `src/data/chapters.ts`, `puzzles` from
  `src/data/puzzles.ts` (Task 4); `progress` from
  `src/lib/stores/progress.ts`, `currentView`/`activePuzzleId`/
  `activeChapterId` from `src/lib/stores/view.ts` (Task 5);
  `isChapterComplete`/`isChapterUnlocked` from
  `src/lib/nonogram/chapterStatus.ts` (Task 3); `MosaicTile` (Task 6).
- Produces: a `ChapterSelect` component that Task 9's `App.svelte` renders
  when `$currentView === 'chapterSelect'`.

- [ ] **Step 1: Write the component**

Create `src/lib/components/ChapterSelect.svelte`:

```svelte
<script lang="ts">
  import { chapters } from "../../data/chapters";
  import { puzzles } from "../../data/puzzles";
  import { progress } from "../stores/progress";
  import { currentView, activePuzzleId, activeChapterId } from "../stores/view";
  import { isChapterComplete, isChapterUnlocked } from "../nonogram/chapterStatus";
  import MosaicTile from "./MosaicTile.svelte";

  // Initialized from the shared store (not null) so that returning here
  // after solving a puzzle — when this component remounts fresh, since
  // it's swapped in/out via {#if $currentView === 'chapterSelect'} —
  // resumes on the puzzle list for the chapter just played, per the spec's
  // "return to the chapter's puzzle list" requirement, instead of always
  // resetting to the top-level chapter grid.
  let selectedChapterId: string | null = $activeChapterId;

  $: selectedChapter = chapters.find((c) => c.id === selectedChapterId) ?? null;

  function openChapter(chapterId: string, unlocked: boolean) {
    if (!unlocked) return;
    selectedChapterId = chapterId;
    activeChapterId.set(chapterId);
  }

  function backToChapters() {
    selectedChapterId = null;
    activeChapterId.set(null);
  }

  function openPuzzle(puzzleId: string) {
    activePuzzleId.set(puzzleId);
    activeChapterId.set(selectedChapterId);
    currentView.set("puzzle");
  }
</script>

{#if selectedChapter}
  <div class="puzzle-list">
    <button class="back-button" on:click={backToChapters}>&larr; Chapters</button>
    <h2>{selectedChapter.title}</h2>
    <div class="puzzle-grid">
      {#each selectedChapter.tiles as tileId, i (tileId)}
        <button class="puzzle-button" on:click={() => openPuzzle(tileId)}>
          {$progress.completed.includes(tileId) ? `✓ ${i + 1}` : i + 1}
        </button>
      {/each}
    </div>
  </div>
{:else}
  <div class="chapter-grid">
    {#each chapters as chapter, index (chapter.id)}
      {@const unlocked = isChapterUnlocked(index, chapters, $progress.completed)}
      {@const complete = isChapterComplete(chapter, $progress.completed)}
      <button
        class="chapter-card"
        class:locked={!unlocked}
        disabled={!unlocked}
        on:click={() => openChapter(chapter.id, unlocked)}
      >
        <div class="mosaic-grid">
          {#each chapter.tiles as tileId, i (tileId)}
            <MosaicTile
              solution={$progress.completed.includes(tileId) ? puzzles[tileId].solution : null}
              label={i + 1}
              cellSize={6}
            />
          {/each}
        </div>
        <span>{chapter.title}{complete ? " ✓" : ""}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .chapter-grid,
  .puzzle-grid {
    display: grid;
    grid-template-columns: repeat(3, auto);
    gap: 1.5rem;
    padding: 1.5rem;
  }
  .chapter-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
  }
  .chapter-card.locked {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .mosaic-grid {
    display: grid;
    grid-template-columns: repeat(3, auto);
    gap: 2px;
    width: 6rem;
  }
  .puzzle-button {
    width: 3rem;
    height: 3rem;
    cursor: pointer;
  }
  .back-button {
    cursor: pointer;
  }
</style>
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/ChapterSelect.svelte
git commit -m "Add Chapter Select view with mosaic cards and puzzle list"
```

---

## Task 8: Puzzle view (grid, clues, interactions, win wiring)

**Files:**
- Create: `src/lib/components/PuzzleView.svelte`

**Interfaces:**
- Consumes: `puzzles` from `src/data/puzzles.ts`; `chapters` from
  `src/data/chapters.ts`; `activePuzzleId`/`activeChapterId`/`currentView`
  from `src/lib/stores/view.ts`; `progress`/`markComplete` from
  `src/lib/stores/progress.ts`; `deriveRowClues`/`deriveColClues`/
  `runLengths`/`cluesEqual` from `src/lib/nonogram/clues.ts`; `checkWin`
  from `src/lib/nonogram/winCheck.ts`; `isChapterComplete` from
  `src/lib/nonogram/chapterStatus.ts`; `CellState` type.
- Produces: a `PuzzleView` component that Task 9's `App.svelte` renders
  when `$currentView === 'puzzle'`.

- [ ] **Step 1: Write the component**

Create `src/lib/components/PuzzleView.svelte`:

```svelte
<script lang="ts">
  import { puzzles } from "../../data/puzzles";
  import { chapters } from "../../data/chapters";
  import { activePuzzleId, activeChapterId, currentView } from "../stores/view";
  import { progress, markComplete } from "../stores/progress";
  import { deriveRowClues, deriveColClues, runLengths, cluesEqual } from "../nonogram/clues";
  import { checkWin } from "../nonogram/winCheck";
  import { isChapterComplete } from "../nonogram/chapterStatus";
  import type { CellState } from "../nonogram/types";

  const puzzle = puzzles[$activePuzzleId as string];
  const rowClues = deriveRowClues(puzzle.solution);
  const colClues = deriveColClues(puzzle.solution);

  let cells: CellState[][] = Array.from({ length: puzzle.size.rows }, () =>
    Array(puzzle.size.cols).fill(0)
  );
  let solved = false;
  let dragState: CellState | null = null;

  $: liveRowRuns = cells.map((row) => runLengths(row.map((c) => (c === 1 ? 1 : 0))));
  $: liveColRuns = colClues.map((_, c) => runLengths(cells.map((row) => (row[c] === 1 ? 1 : 0))));
  $: rowDone = liveRowRuns.map((runs, i) => cluesEqual(runs, rowClues[i]));
  $: colDone = liveColRuns.map((runs, i) => cluesEqual(runs, colClues[i]));

  function toggleCell(r: number, c: number, button: "left" | "right"): CellState {
    const current = cells[r][c];
    const next: CellState = button === "left" ? (current === 1 ? 0 : 1) : current === 2 ? 0 : 2;
    cells[r][c] = next;
    cells = cells;
    return next;
  }

  function onCellMouseDown(r: number, c: number, event: MouseEvent) {
    if (solved) return;
    event.preventDefault();
    const button = event.button === 2 ? "right" : "left";
    dragState = toggleCell(r, c, button);
    void checkForWin();
  }

  function onCellMouseEnter(r: number, c: number) {
    if (solved || dragState === null) return;
    cells[r][c] = dragState;
    cells = cells;
    void checkForWin();
  }

  function endDrag() {
    dragState = null;
  }

  async function checkForWin() {
    if (solved) return;
    if (checkWin(cells, puzzle.solution)) {
      solved = true;
      await markComplete(puzzle.id);
      setTimeout(finishPuzzle, 1200);
    }
  }

  function finishPuzzle() {
    const chapter = chapters.find((c) => c.id === $activeChapterId);
    if (chapter && isChapterComplete(chapter, $progress.completed)) {
      currentView.set("mosaicReveal");
    } else {
      currentView.set("chapterSelect");
    }
  }

  function backToList() {
    currentView.set("chapterSelect");
  }
</script>

<svelte:window on:mouseup={endDrag} />

<div class="puzzle-view">
  <button class="back-button" on:click={backToList}>&larr; Back</button>
  <div
    class="grid-wrapper"
    style="grid-template-columns: max-content repeat({puzzle.size.cols}, 2rem); grid-template-rows: max-content repeat({puzzle.size.rows}, 2rem);"
  >
    <div class="corner"></div>
    {#each colClues as clue, c (c)}
      <div class="col-clue" class:done={colDone[c]}>
        {#each clue as n, i (i)}<span>{n}</span>{/each}
      </div>
    {/each}
    {#each rowClues as clue, r (r)}
      <div class="row-clue" class:done={rowDone[r]}>
        {#each clue as n, i (i)}<span>{n}</span>{/each}
      </div>
      {#each cells[r] as cell, c (c)}
        <div
          class="cell"
          class:filled={cell === 1}
          class:marked={cell === 2}
          on:mousedown={(e) => onCellMouseDown(r, c, e)}
          on:mouseenter={() => onCellMouseEnter(r, c)}
          on:contextmenu|preventDefault
        ></div>
      {/each}
    {/each}
  </div>
  {#if solved}
    <div class="solved-banner">Solved!</div>
  {/if}
</div>

<style>
  .grid-wrapper {
    display: grid;
    gap: 1px;
    background: #ccc;
    width: max-content;
    margin: 1rem;
    user-select: none;
  }
  .cell {
    background: white;
    cursor: pointer;
  }
  .cell.filled {
    background: #2b2b2b;
  }
  .cell.marked::before {
    content: "×";
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
  }
  .col-clue {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    font-size: 0.75rem;
    background: white;
  }
  .row-clue {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
    font-size: 0.75rem;
    background: white;
    padding-right: 4px;
  }
  .col-clue.done,
  .row-clue.done {
    color: #bbb;
  }
  .solved-banner {
    margin: 1rem;
    font-size: 1.5rem;
    font-weight: 600;
  }
  .back-button {
    margin: 1rem;
    cursor: pointer;
  }
</style>
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/PuzzleView.svelte
git commit -m "Add Puzzle view with click/right-click/drag interactions and win-check"
```

---

## Task 9: Mosaic Reveal view and full app wiring

**Files:**
- Create: `src/lib/components/MosaicReveal.svelte`
- Modify: `src/App.svelte`

**Interfaces:**
- Consumes: `chapters` from `src/data/chapters.ts`; `puzzles` from
  `src/data/puzzles.ts`; `activeChapterId`/`currentView` from
  `src/lib/stores/view.ts`; `loadProgress` from
  `src/lib/stores/progress.ts`; `MosaicTile`, `ChapterSelect`, `PuzzleView`.
- Produces: the fully wired app — this is the last task before the build
  can be manually played end-to-end.

- [ ] **Step 1: Write the Mosaic Reveal component**

Create `src/lib/components/MosaicReveal.svelte`:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { chapters } from "../../data/chapters";
  import { puzzles } from "../../data/puzzles";
  import { activeChapterId, currentView } from "../stores/view";
  import MosaicTile from "./MosaicTile.svelte";

  const chapter = chapters.find((c) => c.id === $activeChapterId)!;

  onMount(() => {
    const timer = setTimeout(() => {
      // Clear the active chapter so Chapter Select lands on the top-level
      // grid (showing the newly unlocked next chapter) rather than
      // resuming the just-completed chapter's now all-done puzzle list.
      activeChapterId.set(null);
      currentView.set("chapterSelect");
    }, 3000);
    return () => clearTimeout(timer);
  });
</script>

<div class="mosaic-reveal">
  <h1>{chapter.title} complete!</h1>
  <div class="full-mosaic">
    {#each chapter.tiles as tileId, i (tileId)}
      <div class="reveal-tile" style="animation-delay: {i * 120}ms">
        <MosaicTile solution={puzzles[tileId].solution} label={i + 1} cellSize={8} />
      </div>
    {/each}
  </div>
</div>

<style>
  .mosaic-reveal {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 1.5rem;
  }
  .full-mosaic {
    display: grid;
    grid-template-columns: repeat(3, auto);
    gap: 4px;
  }
  .reveal-tile {
    opacity: 0;
    animation: fade-in 0.4s ease forwards;
  }
  @keyframes fade-in {
    to {
      opacity: 1;
    }
  }
</style>
```

- [ ] **Step 2: Wire up the app shell**

Replace `src/App.svelte`:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { currentView } from "./lib/stores/view";
  import { loadProgress } from "./lib/stores/progress";
  import ChapterSelect from "./lib/components/ChapterSelect.svelte";
  import PuzzleView from "./lib/components/PuzzleView.svelte";
  import MosaicReveal from "./lib/components/MosaicReveal.svelte";

  onMount(() => {
    void loadProgress();
  });
</script>

<main>
  {#if $currentView === "chapterSelect"}
    <ChapterSelect />
  {:else if $currentView === "puzzle"}
    <PuzzleView />
  {:else if $currentView === "mosaicReveal"}
    <MosaicReveal />
  {/if}
</main>
```

Delete the now-unused `src/lib/Counter.svelte` and `src/assets/` files left
over from the Vite template (they are not imported anywhere after this
change).

- [ ] **Step 3: Type-check and build**

Run: `npm run check` — expected: no errors.
Run: `npm run build` — expected: succeeds.

- [ ] **Step 4: Manual smoke test in the browser**

Run: `npm run dev`, open the printed local URL, and confirm: the chapter
grid renders with 3 chapter cards (chapters 2 and 3 shown locked); opening
chapter 1 shows its 9-puzzle list; opening a puzzle shows a clued grid;
left-click fills a cell, right-click marks an X, drag paints a run;
solving a puzzle (fill every cell that matches `solution`) shows "Solved!"
and returns to the puzzle list with that tile now showing a checkmark.
Stop the dev server (Ctrl+C) when done.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Wire up Mosaic Reveal view and full app navigation flow"
```

---

## Task 10: Native build verification and full playtest

**Files:** none (verification-only task).

- [ ] **Step 1: Run the full automated test suite**

Run: `npm run test`
Expected: PASS — every test from Tasks 2, 3, and 4 green.

- [ ] **Step 2: Build the native Windows app**

Run (PowerShell, per the Global Constraints note in Task 1):

```powershell
npm run tauri build
```

Expected: a release build completes and produces an installer/executable
under `src-tauri/target/release/`.

- [ ] **Step 3: Launch the built app and playtest chapter 1 end-to-end**

Run the built executable directly (from
`src-tauri/target/release/`, e.g. `nonogram-mosaic.exe`). Confirm:
- The window opens at the configured size and is resizable.
- All 9 chapter-1 puzzles are solvable and each looks like a recognizable
  fragment of a heart once you know the theme.
- Completing the 9th chapter-1 puzzle triggers the mosaic-reveal animation
  showing a complete heart, then returns to Chapter Select with chapter 1
  marked done and chapter 2 unlocked.
- Close and relaunch the app; confirm chapter 1's progress persisted (its
  tiles still show as complete, chapter 2 still unlocked) — this exercises
  the real `progress.json` file in the app-local-data directory end to end.

- [ ] **Step 4: Verify the corrupted/missing save fallback**

With the app closed, locate `progress.json` in the app's local-data
directory (Windows: `%LOCALAPPDATA%\com.nonogrammosaic.app\`) and delete
it. Relaunch the app — expected: it starts with no completed puzzles and no
crash (the spec's required fallback behavior). Re-solve one puzzle to
confirm saving still works after the fallback.

- [ ] **Step 5: Spot-check chapters 2 and 3 for difficulty curve and picture recognizability**

Play at least 3 puzzles from chapter 2 (star) and 3 from chapter 3
(flower). Confirm no puzzle is degenerate (trivially all-filled or
all-empty — Task 4's data-validation test already guarantees this
structurally, but eyeball that the *pictures* are recognizable once you
know the theme) and that puzzle size increases per chapter (8x8 → 10x10 →
12x12) as a soft difficulty progression, per the spec's requirement for
"a sane difficulty curve" verified by manual playtesting.
