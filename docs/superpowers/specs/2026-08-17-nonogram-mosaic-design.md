# Nonogram Mosaic — Design

## Overview

A desktop puzzle game built with Svelte + Vite, packaged with Tauri. The
player solves classic single-color nonogram (picture logic) puzzles. Each
completed puzzle reveals one tile of a 3x3 mosaic; completing all 9 puzzles
in a chapter reveals the full mosaic image and unlocks the next chapter.

Initial scope: 3 chapters x 9 puzzles = 27 hand-authored puzzles, 3 mosaics.

## Goals

- A fully playable, polished nonogram game with a satisfying meta-progression
  hook (the mosaic reveal) beyond solving puzzles in isolation.
- Simple enough architecture that all 27 puzzles can be hand-authored and
  validated without tooling overhead.
- Ship as a native Windows desktop app.

## Non-goals

- No color-matching nonogram variant (single-color fill only).
- No procedural puzzle generation.
- No level editor (puzzles are authored directly as JSON).
- No online features, accounts, or network calls of any kind.

## Architecture

Three logical layers:

- **Tauri shell** — native window and packaging. Provides file-system access
  (via Tauri's fs API) for reading/writing a local save file in the app's
  local data directory. This is the only layer that touches the OS.
- **Svelte app** — a single-page app with three views swapped via a writable
  Svelte store holding `currentView` (`'chapterSelect' | 'puzzle' |
  'mosaicReveal'`). No routing library needed at this scale.
- **Static content** — 27 puzzle JSON files and 3 chapter/mosaic JSON files,
  bundled into the app at build time (not downloaded at runtime).

Data flows one direction: puzzle JSON -> derived clues (computed once at
load) -> Svelte component state -> user input -> win-check -> progress store
-> persisted to disk.

## Data model

### Puzzle file

Path: `src/data/puzzles/<chapterId>/<puzzleId>.json`

```json
{
  "id": "ch1-p3",
  "size": { "rows": 10, "cols": 10 },
  "solution": [[0,1,1,0,0,1,0,0,0,0], ...]
}
```

`solution` is a 2D binary array — the picture. Row/column numeric clues are
never stored; they are derived once at load time by run-length-encoding each
row and column of `solution`. This guarantees clues and solution can never
drift out of sync — hand-authoring a puzzle is just drawing the picture.

### Chapter / mosaic file

Path: `src/data/chapters/<chapterId>.json`

```json
{
  "id": "ch1",
  "title": "Chapter 1",
  "mosaicSize": { "rows": 3, "cols": 3 },
  "tiles": ["ch1-p1", "ch1-p2", "ch1-p3", "ch1-p4", "ch1-p5",
            "ch1-p6", "ch1-p7", "ch1-p8", "ch1-p9"]
}
```

`tiles` maps mosaic grid position to puzzle id, left-to-right, top-to-bottom.

### Progress (save file)

Path: Tauri app-local-data directory, e.g. `progress.json`

```json
{ "completed": ["ch1-p1", "ch1-p3"] }
```

A puzzle is "completed" the instant its filled cells match `solution`
exactly. X-marks are player notes only and never affect win-checking.
Chapter completion, mosaic-reveal state, and chapter-unlock state are all
derived from this single list at read time — never stored redundantly.

## Screens & mechanics

### Chapter Select

Shows 3 chapter cards, each rendering its mosaic as a 3x3 grid of tiles:
completed tiles show the actual puzzle picture (small, faded in); incomplete
tiles show a numbered placeholder. Clicking a chapter opens its 9-puzzle
list. Chapters unlock strictly in order — chapter N+1 unlocks only once all
9 puzzles in chapter N are complete. This is the entire progression-gating
rule; no separate unlock-rules config is needed.

### Puzzle view

A grid sized to the puzzle (up to 15x15), row clues on the left, column
clues on top.

- Left-click toggles a cell filled.
- Right-click toggles an X mark (player note, no gameplay effect).
- Click-and-drag paints a run of cells with the same action as the first
  cell in the drag (standard nonogram UX).
- Clue numbers gray out automatically once a matching run of filled cells is
  detected in that row/column, as a soft hint.
- Win-check runs after every cell change: if filled cells exactly equal
  `solution`, the puzzle is complete — play a brief completion animation,
  mark the puzzle complete in the progress store, persist progress to disk,
  and return to the chapter's puzzle list (now showing that tile's picture).

### Mosaic Reveal

Triggered automatically when the 9th puzzle in a chapter is completed: a
short full-screen animation assembles the 9 now-known tile pictures into the
complete mosaic image, then returns to Chapter Select with that chapter
marked done and the next chapter unlocked.

## Persistence & error handling

Progress is written to a single JSON file in Tauri's app-local-data
directory after every puzzle completion. Writes are small and infrequent, so
no debouncing or explicit save button is needed.

On launch, the app reads that file if present. If it is missing (first run)
or fails to parse (corrupted), the app falls back to an empty progress state
rather than crashing. Worst case in that scenario: previously-completed
puzzles appear incomplete again — recoverable, non-destructive, and requires
no special-case UI.

There are no network calls and no external services, so this is the entire
error surface: file read/parse failure -> default to empty state.

## Testing

- **Puzzle data validation** — a script/test loading every puzzle JSON,
  asserting `solution`'s dimensions match `size`, and that every puzzle id
  referenced in a chapter's `tiles` list exists. Catches hand-authoring
  mistakes before they ship.
- **Clue derivation** — unit tests on the run-length-encoding function
  (the core logic of the game): known grids in, known clue arrays out,
  including edge cases (empty row, fully-filled row).
- **Win-check logic** — unit tests: exact match wins, X-marks don't affect
  the result, partial fill does not win.
- **Manual playtesting** — for feel (drag-painting, right-click marking,
  mosaic reveal animation) and to verify each hand-authored puzzle's picture
  is recognizable with a sane difficulty curve. Not something automated
  tests can judge.

## Open items for implementation planning

None — this spec is scoped for a single implementation plan covering
project scaffolding, the puzzle/chapter data model, the three screens, and
the initial content (27 puzzles across 3 chapters).
