# Level Editor — Design

## Overview

A puzzle editor section, separate from the built-in chapters, where the
player draws a picture on a blank grid and the game derives that puzzle's
row/column clues automatically — the same run-length-encoding the built-in
puzzles already use. Saved puzzles are playable in-app through the existing
solve screen.

This supersedes the original design spec's non-goal of "no level editor";
everything else in that spec (chapters, mosaics, progress) is unaffected.

## Goals

- Let the player create nonogram puzzles by painting a solution grid, with
  clues generated automatically — never hand-typed, so they can't drift out
  of sync with the picture (same guarantee the built-in puzzles rely on).
- Let the player play back anything they've created, using the existing
  solve screen and win-check logic.
- Persist custom puzzles locally so they survive an app restart.
- Keep custom puzzles entirely separate from the chapter/mosaic
  progression system — no chapter membership, no mosaic reveal, no
  interaction with `progress.json`.

## Non-goals

- No editing/authoring of chapters or mosaics themselves.
- No sharing, import/export, or any file picker UI — puzzles are saved and
  loaded automatically, the same way progress is.
- No procedural or assisted generation (e.g. "make this solvable" hints,
  symmetry tools, uniqueness checking). The player draws whatever they want;
  if it has an ambiguous or trivial clue set, that's their puzzle.

## Architecture

Reuses the existing three-layer structure (Tauri shell / Svelte app / data)
rather than introducing anything new:

- Two new views (`"editorList"`, `"editor"`) added to the existing
  `currentView` store, following the same swap-on-store pattern as the four
  existing views.
- A new `customPuzzles` store, mirroring `progress.ts`'s pattern exactly:
  a writable array persisted to a JSON file in Tauri's app-local-data
  directory (`custom-puzzles.json`, alongside `progress.json`).
- `PuzzleView` (the existing solve screen) is extended, not duplicated, to
  play both bundled and custom puzzles.
- Clue generation reuses `deriveRowClues`/`deriveColClues` from
  `clues.ts` unchanged — the editor's live clue preview and the solve
  screen's clue display are the same function call.

## Data model

### CustomPuzzle

Added to `types.ts`:

```ts
export interface CustomPuzzle {
  id: string;          // "custom-<uuid>"
  title: string;
  size: { rows: number; cols: number };
  solution: number[][];
  createdAt: string;   // ISO timestamp
}
```

`id`s are prefixed `custom-` so they can never collide with bundled puzzle
ids (`ch1-p1`, etc.), which matters because `PuzzleView` looks a puzzle up
in the bundled set first and falls back to the custom set.

### Custom puzzles file

Path: Tauri app-local-data directory, `custom-puzzles.json`.

```json
[
  { "id": "custom-...", "title": "My cat", "size": {"rows":10,"cols":10},
    "solution": [[0,1,...], ...], "createdAt": "2026-08-18T12:00:00.000Z" }
]
```

A flat array, written in full on every save/delete — same trade-off
`progress.ts` already makes (writes are small and infrequent; no
debouncing needed).

## Store: `customPuzzles.ts`

Mirrors `progress.ts`:

- `customPuzzles: Writable<CustomPuzzle[]>`
- `loadCustomPuzzles(): Promise<void>` — reads the file on `App.svelte`
  mount (alongside the existing `loadProgress()` call); missing or
  unparsable file falls back to `[]`, same non-crashing behavior as
  progress loading.
- `saveCustomPuzzle(puzzle: CustomPuzzle): Promise<void>` — upserts by id
  into the store, persists the full array.
- `deleteCustomPuzzle(id: string): Promise<void>` — removes by id from the
  store, persists the full array.

## Navigation

`view.ts` additions:

```ts
export type ViewName =
  | "titleScreen" | "chapterSelect" | "puzzle" | "mosaicReveal"
  | "editorList" | "editor";

export const activeEditorPuzzleId = writable<string | null>(null); // null = new puzzle
export const editorGridSize = writable<{ rows: number; cols: number }>({ rows: 8, cols: 8 });
```

`TitleScreen` gets a second button, "Create", setting `currentView` to
`"editorList"`. `App.svelte` gets one new `{:else if}` branch per new view.

## Screens

### EditorList ("My Puzzles")

- Lists saved custom puzzles (title, size), each with **Play**, **Edit**,
  and **Delete** actions.
- **Delete** removes immediately (no undo) — custom puzzles are low-stakes,
  re-creatable content, consistent with the app's no-confirmation-dialogs
  style elsewhere.
- **New Puzzle** opens an inline size chooser (rows x cols — a few presets
  such as 5x5 / 8x8 / 10x10, plus free-entry number inputs) before handing
  off to the editor with a blank grid.
- **Play** sets `activePuzzleId` to the custom puzzle's id and
  `currentView` to `"puzzle"` — identical to how `ChapterSelect` opens a
  built-in puzzle.
- **Edit** sets `activeEditorPuzzleId` to the puzzle's id, `editorGridSize`
  to its size, and `currentView` to `"editor"`.
- Empty state (no saved puzzles yet) shows a short prompt pointing at "New
  Puzzle".

### PuzzleEditor

A grid the same visual shape as `PuzzleView`'s (same cell size, clue
layout, styling), but:

- Only two paint states — filled / empty (no X-mark state; marks are a
  solving aid and the editor has nothing to "solve").
- Click-and-drag paints a run with the same action as the first cell in the
  drag, reusing `PuzzleView`'s drag-paint interaction.
- Row/column clues are computed live from the grid being painted
  (`deriveRowClues(cells)` / `deriveColClues(cells)`) — not compared against
  anything, just displayed, updating as the player paints. This is the
  auto-clue-generation requirement.
- A title text input (required to save; defaults to focus-on-mount so
  naming happens naturally at the start).
- **Save** — validates a non-empty title, generates an id if this is a new
  puzzle (`crypto.randomUUID()`, prefixed), calls `saveCustomPuzzle`, then
  returns to `editorList`.
- **Clear** — resets the grid to all-empty (with the title kept).
- **Cancel** — discards any unsaved changes and returns to `editorList`.
- On mount: if `activeEditorPuzzleId` is set, load that puzzle's title and
  solution from `customPuzzles` to prefill the grid (edit mode); otherwise
  start from an all-empty grid at `editorGridSize` (new-puzzle mode). Size
  is fixed for the lifetime of an editing session — resizing an
  in-progress puzzle is out of scope (start a new puzzle instead).

### PuzzleView (extended)

- Puzzle lookup falls back from the bundled set to the custom set:
  `puzzles[id] ?? customPuzzles.find(p => p.id === id)`.
- `isCustom` flag (true when the id isn't in the bundled `puzzles` map)
  changes two behaviors:
  - The win-check path skips `markComplete` entirely — custom puzzles
    never touch `progress.json` or chapter-completion logic.
  - "Back" and the post-solve transition go to `"editorList"` instead of
    `"chapterSelect"`; the mosaic-reveal chapter-completion check is
    skipped outright.
- Everything else (drag-paint, X-marks, live clue graying, win detection)
  is unchanged and shared as-is.

## Error handling

Same posture as progress persistence: file read/parse failure on load
falls back to an empty list rather than crashing; write failures are
caught and logged (`console.warn`), matching `markComplete`'s existing
behavior, since a failed save is recoverable (the player can just retry)
and shouldn't crash the app mid-session.

## Testing

- **Unit tests** for `customPuzzles.ts`'s upsert/delete logic (given a
  starting array and a puzzle, assert the resulting array) — no Tauri
  runtime needed since the file I/O is a thin wrapper around it.
- **Manual testing**: create a puzzle, verify live clues match the painted
  grid, save, restart the app, confirm it's still in the list, play it to
  completion, edit an existing one and confirm changes persist, delete one.
- No changes needed to existing clue/win-check unit tests — this feature
  calls the same functions with new inputs, not new logic.

## Open items for implementation planning

None — this spec is scoped for a single implementation plan: the data
model and store, the two new screens, the `PuzzleView` extension, and the
title-screen entry point.
