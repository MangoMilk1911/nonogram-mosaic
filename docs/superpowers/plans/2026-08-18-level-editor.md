# Level Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Create" section where the player paints a puzzle's solution grid, gets its row/column clues generated automatically, saves it locally, and can play it back through the existing solve screen.

**Architecture:** Two new Svelte views (`editorList`, `editor`) added to the existing store-driven view-swap in `App.svelte`. A new `customPuzzles` store persists to a JSON file in Tauri's app-local-data directory, mirroring the existing `progress.ts` pattern exactly. The existing `PuzzleView` solve screen is extended (not duplicated) to also play custom puzzles. Clue generation reuses `deriveRowClues`/`deriveColClues` from `clues.ts` unchanged.

**Tech Stack:** Svelte 5 + TypeScript, Vite, Tauri 2 (`@tauri-apps/plugin-fs`, `@tauri-apps/api/path`), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-18-level-editor-design.md`

## Global Constraints

- Custom puzzle ids are always prefixed `custom-` so they can never collide with bundled puzzle ids (e.g. `ch1-p1`).
- Custom puzzles never write to `progress.json` and never affect chapter-completion or mosaic-reveal logic.
- No confirmation dialogs — delete is immediate, consistent with the rest of the app.
- No import/export or file-picker UI — puzzles are saved/loaded automatically, the same way progress is.
- Persistence follows `progress.ts`'s exact pattern: the full array is written to a JSON file in Tauri's app-local-data directory on every change; a missing or unparsable file falls back to an empty state rather than crashing.

---

### Task 1: Custom puzzle data model & store

**Files:**
- Modify: `src/lib/nonogram/types.ts`
- Create: `src/lib/stores/customPuzzles.ts`
- Test: `src/lib/stores/customPuzzles.test.ts`

**Interfaces:**
- Produces: `CustomPuzzle` type (`id: string`, `title: string`, `size: { rows: number; cols: number }`, `solution: number[][]`, `createdAt: string`); `customPuzzles: Writable<CustomPuzzle[]>` store; `loadCustomPuzzles(): Promise<void>`; `saveCustomPuzzle(puzzle: CustomPuzzle): Promise<void>`; `deleteCustomPuzzle(id: string): Promise<void>`; pure helpers `upsertCustomPuzzle(list, puzzle): CustomPuzzle[]` and `removeCustomPuzzle(list, id): CustomPuzzle[]` — all consumed by Tasks 2 and 3.

- [ ] **Step 1: Add the `CustomPuzzle` type**

Add to `src/lib/nonogram/types.ts` (after the existing `Puzzle` interface):

```ts
export interface CustomPuzzle {
  id: string;
  title: string;
  size: { rows: number; cols: number };
  solution: number[][];
  createdAt: string;
}
```

- [ ] **Step 2: Write the failing test for the pure upsert/remove helpers**

Create `src/lib/stores/customPuzzles.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- customPuzzles`
Expected: FAIL — `src/lib/stores/customPuzzles.ts` doesn't exist yet (module not found).

- [ ] **Step 4: Implement the store**

Create `src/lib/stores/customPuzzles.ts`:

```ts
import { writable } from "svelte/store";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import type { CustomPuzzle } from "../nonogram/types";

const CUSTOM_PUZZLES_FILE = "custom-puzzles.json";

export const customPuzzles = writable<CustomPuzzle[]>([]);

export function upsertCustomPuzzle(list: CustomPuzzle[], puzzle: CustomPuzzle): CustomPuzzle[] {
  const index = list.findIndex((p) => p.id === puzzle.id);
  if (index === -1) return [...list, puzzle];
  const next = list.slice();
  next[index] = puzzle;
  return next;
}

export function removeCustomPuzzle(list: CustomPuzzle[], id: string): CustomPuzzle[] {
  return list.filter((p) => p.id !== id);
}

async function customPuzzlesFilePath(): Promise<string> {
  const dir = await appLocalDataDir();
  return join(dir, CUSTOM_PUZZLES_FILE);
}

async function persist(list: CustomPuzzle[]): Promise<void> {
  const dir = await appLocalDataDir();
  await mkdir(dir, { recursive: true });
  const path = await customPuzzlesFilePath();
  await writeTextFile(path, JSON.stringify(list));
}

export async function loadCustomPuzzles(): Promise<void> {
  try {
    const path = await customPuzzlesFilePath();
    if (!(await exists(path))) {
      customPuzzles.set([]);
      return;
    }
    const text = await readTextFile(path);
    const parsed = JSON.parse(text);
    customPuzzles.set(Array.isArray(parsed) ? parsed : []);
  } catch {
    customPuzzles.set([]);
  }
}

export async function saveCustomPuzzle(puzzle: CustomPuzzle): Promise<void> {
  let next: CustomPuzzle[] = [];
  customPuzzles.update((current) => {
    next = upsertCustomPuzzle(current, puzzle);
    return next;
  });
  try {
    await persist(next);
  } catch (error) {
    console.warn("Failed to save custom puzzle:", error);
  }
}

export async function deleteCustomPuzzle(id: string): Promise<void> {
  let next: CustomPuzzle[] = [];
  customPuzzles.update((current) => {
    next = removeCustomPuzzle(current, id);
    return next;
  });
  try {
    await persist(next);
  } catch (error) {
    console.warn("Failed to delete custom puzzle:", error);
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- customPuzzles`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/nonogram/types.ts src/lib/stores/customPuzzles.ts src/lib/stores/customPuzzles.test.ts
git commit -m "Add CustomPuzzle type and customPuzzles store"
```

---

### Task 2: Navigation, "My Puzzles" list, and the puzzle editor screen

**Files:**
- Modify: `src/lib/stores/view.ts`
- Modify: `src/App.svelte`
- Modify: `src/lib/components/TitleScreen.svelte`
- Create: `src/lib/components/EditorList.svelte`
- Create: `src/lib/components/PuzzleEditor.svelte`

**Interfaces:**
- Consumes: `customPuzzles`, `loadCustomPuzzles`, `saveCustomPuzzle`, `deleteCustomPuzzle` from `../stores/customPuzzles` (Task 1); `CustomPuzzle` from `../nonogram/types` (Task 1); `deriveRowClues`, `deriveColClues` from `../nonogram/clues` (existing).
- Produces: `ViewName` extended with `"editorList" | "editor"`; new stores `activeEditorPuzzleId: Writable<string | null>` and `editorGridSize: Writable<{ rows: number; cols: number }>` — consumed by Task 3's `PuzzleView` changes indirectly (via `activePuzzleId`, already existing) and directly by `EditorList`/`PuzzleEditor` here.

- [ ] **Step 1: Extend the view store**

In `src/lib/stores/view.ts`, replace the full contents with:

```ts
import { writable } from "svelte/store";

export type ViewName =
  | "titleScreen"
  | "chapterSelect"
  | "puzzle"
  | "mosaicReveal"
  | "editorList"
  | "editor";

export const currentView = writable<ViewName>("titleScreen");
export const activePuzzleId = writable<string | null>(null);
export const activeChapterId = writable<string | null>(null);
export const activeEditorPuzzleId = writable<string | null>(null);
export const editorGridSize = writable<{ rows: number; cols: number }>({ rows: 8, cols: 8 });
```

- [ ] **Step 2: Add the "Create" button to the title screen**

In `src/lib/components/TitleScreen.svelte`, replace the `<script>` block with:

```svelte
<script lang="ts">
  import { currentView } from "../stores/view";
  import Mark from "./Mark.svelte";

  function play() {
    currentView.set("chapterSelect");
  }

  function create() {
    currentView.set("editorList");
  }
</script>
```

Replace the `<button class="play-button" on:click={play}>Play</button>` line with:

```svelte
  <div class="title-actions">
    <button class="play-button" on:click={play}>Play</button>
    <button class="create-button" on:click={create}>Create</button>
  </div>
```

Add to the `<style>` block (after `.tagline`):

```css
  .title-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }
```

Remove `margin-top: 0.75rem;` from the existing `.play-button` rule (the new `.title-actions` wrapper now owns that spacing), and add:

```css
  .create-button {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--ink);
    background: transparent;
    border: 1px solid var(--hair);
    border-radius: var(--radius-md);
    padding: 0.75rem 2.25rem;
    cursor: pointer;
  }
  .create-button:hover {
    background: var(--hollow);
  }
```

- [ ] **Step 3: Create the "My Puzzles" list screen**

Create `src/lib/components/EditorList.svelte`:

```svelte
<script lang="ts">
  import { customPuzzles, deleteCustomPuzzle } from "../stores/customPuzzles";
  import { currentView, activePuzzleId, activeEditorPuzzleId, editorGridSize } from "../stores/view";

  const presets = [
    { rows: 5, cols: 5 },
    { rows: 8, cols: 8 },
    { rows: 10, cols: 10 },
  ];

  let showNewPuzzleForm = false;
  let customRows = 8;
  let customCols = 8;

  function openNewPuzzleForm() {
    showNewPuzzleForm = true;
  }

  function cancelNewPuzzleForm() {
    showNewPuzzleForm = false;
  }

  function startNewPuzzle(rows: number, cols: number) {
    activeEditorPuzzleId.set(null);
    editorGridSize.set({ rows, cols });
    currentView.set("editor");
  }

  function editPuzzle(id: string) {
    activeEditorPuzzleId.set(id);
    const puzzle = $customPuzzles.find((p) => p.id === id);
    if (puzzle) editorGridSize.set(puzzle.size);
    currentView.set("editor");
  }

  function playPuzzle(id: string) {
    activePuzzleId.set(id);
    currentView.set("puzzle");
  }

  function removePuzzle(id: string) {
    void deleteCustomPuzzle(id);
  }

  function backToTitle() {
    currentView.set("titleScreen");
  }
</script>

<div class="screen">
  <button class="back-button" on:click={backToTitle}>&larr; Home</button>
  <h2>My Puzzles</h2>

  {#if $customPuzzles.length === 0 && !showNewPuzzleForm}
    <p class="empty-hint">No puzzles yet — start one below.</p>
  {/if}

  {#if $customPuzzles.length > 0}
    <ul class="puzzle-list">
      {#each $customPuzzles as puzzle (puzzle.id)}
        <li class="puzzle-row">
          <span class="puzzle-title">{puzzle.title}</span>
          <span class="puzzle-size">{puzzle.size.rows}&times;{puzzle.size.cols}</span>
          <span class="puzzle-actions">
            <button on:click={() => playPuzzle(puzzle.id)}>Play</button>
            <button on:click={() => editPuzzle(puzzle.id)}>Edit</button>
            <button class="danger" on:click={() => removePuzzle(puzzle.id)}>Delete</button>
          </span>
        </li>
      {/each}
    </ul>
  {/if}

  {#if showNewPuzzleForm}
    <div class="new-puzzle-form">
      <h3>New Puzzle</h3>
      <div class="presets">
        {#each presets as preset (preset.rows + "x" + preset.cols)}
          <button on:click={() => startNewPuzzle(preset.rows, preset.cols)}>
            {preset.rows}&times;{preset.cols}
          </button>
        {/each}
      </div>
      <div class="custom-size">
        <label>
          Rows
          <input type="number" min="3" max="20" bind:value={customRows} />
        </label>
        <label>
          Cols
          <input type="number" min="3" max="20" bind:value={customCols} />
        </label>
        <button on:click={() => startNewPuzzle(customRows, customCols)}>Start</button>
      </div>
      <button class="back-button" on:click={cancelNewPuzzleForm}>Cancel</button>
    </div>
  {:else}
    <button class="new-puzzle-button" on:click={openNewPuzzleForm}>New Puzzle</button>
  {/if}
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: calc(100vh - 6rem);
    padding: 1.5rem 1.75rem;
  }
  .back-button {
    align-self: flex-start;
    font-family: var(--font-heading);
    font-weight: 600;
    color: var(--muted);
    background: none;
    border: none;
    padding: 0;
    margin-bottom: 0.75rem;
    cursor: pointer;
  }
  .back-button:hover {
    color: var(--ink);
  }
  .empty-hint {
    color: var(--muted);
  }
  .puzzle-list {
    list-style: none;
    margin: 0.5rem 0;
    padding: 0;
    width: 100%;
    max-width: 32rem;
  }
  .puzzle-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--hair);
    border-radius: var(--radius-md);
    background: var(--panel);
    margin-bottom: 0.6rem;
  }
  .puzzle-title {
    font-family: var(--font-heading);
    font-weight: 600;
    flex: 1;
  }
  .puzzle-size {
    color: var(--muted);
    font-size: 0.85rem;
  }
  .puzzle-actions {
    display: flex;
    gap: 0.4rem;
  }
  .puzzle-actions button {
    font-family: var(--font-body);
    font-weight: 600;
    color: var(--ink);
    background: var(--hollow);
    border: 1px solid var(--hair);
    border-radius: var(--radius-md);
    padding: 0.35rem 0.75rem;
    cursor: pointer;
  }
  .puzzle-actions .danger {
    color: var(--ruby);
  }
  .new-puzzle-button {
    margin-top: 1rem;
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1.05rem;
    color: #fff;
    background: var(--amber);
    border: none;
    border-radius: var(--radius-md);
    padding: 0.65rem 1.75rem;
    cursor: pointer;
  }
  .new-puzzle-button:hover {
    background: var(--ruby);
  }
  .new-puzzle-form {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem;
    border: 1px solid var(--hair);
    border-radius: var(--radius-lg);
    background: var(--panel);
  }
  .presets,
  .custom-size {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .presets button,
  .custom-size button {
    font-family: var(--font-body);
    font-weight: 600;
    color: var(--ink);
    background: var(--hollow);
    border: 1px solid var(--hair);
    border-radius: var(--radius-md);
    padding: 0.5rem 0.9rem;
    cursor: pointer;
  }
  .custom-size label {
    display: flex;
    flex-direction: column;
    font-size: 0.8rem;
    color: var(--muted);
    gap: 0.2rem;
  }
  .custom-size input {
    width: 3.5rem;
    padding: 0.3rem;
    border: 1px solid var(--hair);
    border-radius: var(--radius-md);
    background: var(--bg);
    color: var(--ink);
  }
</style>
```

- [ ] **Step 4: Create the puzzle editor screen**

Create `src/lib/components/PuzzleEditor.svelte`:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { customPuzzles, saveCustomPuzzle } from "../stores/customPuzzles";
  import { currentView, activeEditorPuzzleId, editorGridSize } from "../stores/view";
  import { deriveRowClues, deriveColClues } from "../nonogram/clues";
  import type { CustomPuzzle } from "../nonogram/types";

  const existing = $activeEditorPuzzleId
    ? ($customPuzzles.find((p) => p.id === $activeEditorPuzzleId) ?? null)
    : null;
  const size = existing ? existing.size : $editorGridSize;

  let title = existing ? existing.title : "";
  let titleError = false;
  let titleInput: HTMLInputElement;
  let cells: number[][] = existing
    ? existing.solution.map((row) => row.slice())
    : Array.from({ length: size.rows }, () => Array(size.cols).fill(0));
  let dragState: number | null = null;

  $: rowClues = deriveRowClues(cells);
  $: colClues = deriveColClues(cells);

  onMount(() => titleInput?.focus());

  function paintCell(r: number, c: number, value: number) {
    cells[r][c] = value;
    cells = cells;
  }

  function onCellMouseDown(r: number, c: number) {
    const next = cells[r][c] === 1 ? 0 : 1;
    dragState = next;
    paintCell(r, c, next);
  }

  function onCellMouseEnter(r: number, c: number) {
    if (dragState === null) return;
    paintCell(r, c, dragState);
  }

  function endDrag() {
    dragState = null;
  }

  function clearGrid() {
    cells = cells.map((row) => row.map(() => 0));
  }

  async function save() {
    if (!title.trim()) {
      titleError = true;
      return;
    }
    titleError = false;
    const puzzle: CustomPuzzle = {
      id: existing ? existing.id : `custom-${crypto.randomUUID()}`,
      title: title.trim(),
      size,
      solution: cells.map((row) => row.slice()),
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
    };
    await saveCustomPuzzle(puzzle);
    currentView.set("editorList");
  }

  function cancel() {
    currentView.set("editorList");
  }
</script>

<svelte:window on:mouseup={endDrag} />

<div class="editor-view">
  <button class="back-button" on:click={cancel}>&larr; Cancel</button>
  <input
    class="title-input"
    class:error={titleError}
    type="text"
    placeholder="Puzzle title"
    bind:value={title}
    bind:this={titleInput}
  />
  <div
    class="grid-wrapper"
    style="grid-template-columns: max-content repeat({size.cols}, 2rem); grid-template-rows: max-content repeat({size.rows}, 2rem);"
  >
    <div class="corner"></div>
    {#each colClues as clue, c (c)}
      <div class="col-clue">
        {#each clue as n, i (i)}<span>{n}</span>{/each}
      </div>
    {/each}
    {#each rowClues as clue, r (r)}
      <div class="row-clue">
        {#each clue as n, i (i)}<span>{n}</span>{/each}
      </div>
      {#each cells[r] as cell, c (c)}
        <div
          class="cell"
          class:filled={cell === 1}
          on:mousedown={() => onCellMouseDown(r, c)}
          on:mouseenter={() => onCellMouseEnter(r, c)}
        ></div>
      {/each}
    {/each}
  </div>
  <div class="editor-actions">
    <button class="clear-button" on:click={clearGrid}>Clear</button>
    <button class="save-button" on:click={save}>Save</button>
  </div>
</div>

<style>
  .editor-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: calc(100vh - 6rem);
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1.75rem 1.75rem;
  }
  .back-button {
    align-self: flex-start;
    font-family: var(--font-heading);
    font-weight: 600;
    color: var(--muted);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .back-button:hover {
    color: var(--ink);
  }
  .title-input {
    font-family: var(--font-heading);
    font-size: 1.1rem;
    padding: 0.5rem 0.9rem;
    border: 1px solid var(--hair);
    border-radius: var(--radius-md);
    background: var(--panel);
    color: var(--ink);
    width: 16rem;
    max-width: 100%;
  }
  .title-input.error {
    border-color: var(--ruby);
  }
  .grid-wrapper {
    display: grid;
    gap: 3px;
    background: var(--lead);
    padding: 3px;
    border-radius: 4px;
    width: max-content;
    margin: 0.5rem 0;
    user-select: none;
  }
  .cell {
    background: var(--hollow);
    border-radius: 1px;
    cursor: pointer;
  }
  .cell.filled {
    background: var(--cobalt);
  }
  .col-clue,
  .row-clue,
  .corner {
    background: var(--panel);
  }
  .col-clue {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--ink);
    padding-bottom: 3px;
  }
  .row-clue {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--ink);
    padding-right: 6px;
    border-radius: 1px;
  }
  .editor-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
  .editor-actions button {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1rem;
    border: none;
    border-radius: var(--radius-md);
    padding: 0.6rem 1.5rem;
    cursor: pointer;
  }
  .clear-button {
    color: var(--ink);
    background: var(--hollow);
    border: 1px solid var(--hair) !important;
  }
  .save-button {
    color: #fff;
    background: var(--teal);
  }
</style>
```

- [ ] **Step 5: Wire the new views into the app shell**

In `src/App.svelte`, update the imports and `onMount`:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { currentView } from "./lib/stores/view";
  import { loadProgress } from "./lib/stores/progress";
  import { loadCustomPuzzles } from "./lib/stores/customPuzzles";
  import { dark, initTheme, toggleTheme } from "./lib/stores/theme";
  import TitleScreen from "./lib/components/TitleScreen.svelte";
  import ChapterSelect from "./lib/components/ChapterSelect.svelte";
  import PuzzleView from "./lib/components/PuzzleView.svelte";
  import MosaicReveal from "./lib/components/MosaicReveal.svelte";
  import EditorList from "./lib/components/EditorList.svelte";
  import PuzzleEditor from "./lib/components/PuzzleEditor.svelte";
  import Mark from "./lib/components/Mark.svelte";

  onMount(() => {
    initTheme();
    void loadProgress();
    void loadCustomPuzzles();
  });

  function goHome() {
    currentView.set("titleScreen");
  }
</script>
```

And add two branches to the view `{#if}` chain:

```svelte
    {#if $currentView === "titleScreen"}
      <TitleScreen />
    {:else if $currentView === "chapterSelect"}
      <ChapterSelect />
    {:else if $currentView === "puzzle"}
      <PuzzleView />
    {:else if $currentView === "mosaicReveal"}
      <MosaicReveal />
    {:else if $currentView === "editorList"}
      <EditorList />
    {:else if $currentView === "editor"}
      <PuzzleEditor />
    {/if}
```

- [ ] **Step 6: Type-check**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 7: Manual test**

Run: `npm run dev`, open the app in the browser it prints.

1. From the title screen, click "Create" — lands on an empty "My Puzzles" screen with a "New Puzzle" button.
2. Click "New Puzzle", pick the 8x8 preset — lands on a blank 8x8 editor grid, title field focused.
3. Paint a few cells and confirm the row/column clue numbers next to the grid update live as you paint.
4. Type a title, click "Save" — returns to "My Puzzles", which now lists that puzzle with its title and "8×8".
5. Click "Edit" on it, change a cell, save again — re-opening "Edit" shows the change persisted.
6. Click "Delete" — the puzzle disappears from the list.
7. Click "Save" with an empty title — the title field gets an error outline and nothing is saved.

- [ ] **Step 8: Commit**

```bash
git add src/lib/stores/view.ts src/App.svelte src/lib/components/TitleScreen.svelte src/lib/components/EditorList.svelte src/lib/components/PuzzleEditor.svelte
git commit -m "Add My Puzzles list and puzzle editor screen"
```

---

### Task 3: Play custom puzzles through the existing solve screen

**Files:**
- Modify: `src/lib/components/PuzzleView.svelte`

**Interfaces:**
- Consumes: `customPuzzles` store from `../stores/customPuzzles` (Task 1); existing `puzzles` from `../../data/puzzles`, `activePuzzleId`/`activeChapterId`/`currentView` from `../stores/view` (unchanged).

- [ ] **Step 1: Fall back to custom puzzles in the lookup**

In `src/lib/components/PuzzleView.svelte`, add the import and change the puzzle lookup:

```ts
  import { customPuzzles } from "../stores/customPuzzles";
```

Replace:

```ts
  const puzzle = puzzles[$activePuzzleId as string];
```

with:

```ts
  const puzzle = puzzles[$activePuzzleId as string] ?? $customPuzzles.find((p) => p.id === $activePuzzleId);
  const isCustom = !(($activePuzzleId as string) in puzzles);
```

- [ ] **Step 2: Skip progress tracking for custom puzzles**

Replace `checkForWin`:

```ts
  async function checkForWin() {
    if (solved) return;
    if (checkWin(cells, puzzle.solution)) {
      solved = true;
      if (!isCustom) {
        await markComplete(puzzle.id);
      }
      setTimeout(finishPuzzle, 1200);
    }
  }
```

- [ ] **Step 3: Route custom-puzzle completion and "Back" to the editor list**

Replace `finishPuzzle`:

```ts
  function finishPuzzle() {
    if (isCustom) {
      currentView.set("editorList");
      return;
    }
    const chapter = chapters.find((c) => c.id === $activeChapterId);
    if (chapter && isChapterComplete(chapter, $progress.completed)) {
      currentView.set("mosaicReveal");
    } else {
      currentView.set("chapterSelect");
    }
  }
```

Replace `backToList`:

```ts
  function backToList() {
    currentView.set(isCustom ? "editorList" : "chapterSelect");
  }
```

- [ ] **Step 4: Type-check**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 5: Manual test**

Run: `npm run dev`.

1. Create and save a small custom puzzle (e.g. 5x5) via "Create" as in Task 2's manual test.
2. From "My Puzzles", click "Play" on it.
3. Paint the exact same cells you drew when creating it — confirm the "Solved!" banner appears and it returns to "My Puzzles" (not chapter select or a mosaic reveal).
4. Click "Back" mid-solve on a custom puzzle — confirm it returns to "My Puzzles", not chapter select.
5. Go play a built-in chapter puzzle to completion — confirm chapter/mosaic behavior is unchanged and the custom-puzzle play didn't affect chapter completion state.

- [ ] **Step 6: Run the full test suite**

Run: `npm test && npm run check`
Expected: all existing and new tests pass, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/PuzzleView.svelte
git commit -m "Play custom puzzles through the existing solve screen"
```

---

## Self-review notes

- **Spec coverage:** data model (Task 1), storage (Task 1), navigation/entry point (Task 2), EditorList (Task 2), PuzzleEditor + live clue generation (Task 2), PuzzleView extension/isCustom branching (Task 3), error handling (Task 1's try/catch matching `progress.ts`) — all covered.
- **Type consistency:** `CustomPuzzle` fields (`id`, `title`, `size`, `solution`, `createdAt`) are used identically across Tasks 1–3; `activeEditorPuzzleId`/`editorGridSize` (Task 2) match the names Task 2's own components use; no other task reads them.
- **No placeholders:** every step has complete, runnable code; manual-test steps list concrete actions and expected results rather than "verify it works."
