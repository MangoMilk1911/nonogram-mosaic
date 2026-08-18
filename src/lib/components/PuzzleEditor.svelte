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
