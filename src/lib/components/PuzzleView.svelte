<script lang="ts">
  import { puzzles } from "../../data/puzzles";
  import { chapters } from "../../data/chapters";
  import { activePuzzleId, activeChapterId, currentView } from "../stores/view";
  import { progress, markComplete } from "../stores/progress";
  import { deriveRowClues, deriveColClues, runLengths, cluesEqual } from "../nonogram/clues";
  import { checkWin } from "../nonogram/winCheck";
  import { isChapterComplete } from "../nonogram/chapterStatus";
  import type { CellState } from "../nonogram/types";
  import { customPuzzles } from "../stores/customPuzzles";

  const puzzle = puzzles[$activePuzzleId as string] ?? $customPuzzles.find((p) => p.id === $activePuzzleId);
  const isCustom = !(($activePuzzleId as string) in puzzles);
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
      if (!isCustom) {
        await markComplete(puzzle.id);
      }
      setTimeout(finishPuzzle, 1200);
    }
  }

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

  function backToList() {
    currentView.set(isCustom ? "editorList" : "chapterSelect");
  }
</script>

<svelte:window on:mouseup={endDrag} />

<div class="puzzle-view">
  <button class="back-button" on:click={backToList}>&larr; Back</button>
  <div
    class="grid-wrapper"
    class:solved
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
  .puzzle-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: calc(100vh - 6rem);
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1.75rem 1.75rem;
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
    transition: background 0.3s ease;
  }
  .grid-wrapper.solved .cell.filled {
    background: var(--teal);
  }
  .cell.marked::before {
    content: "×";
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--muted);
    font-weight: 700;
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
  .col-clue.done,
  .row-clue.done {
    color: var(--muted);
  }
  .solved-banner {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1.5rem;
    color: var(--teal);
  }
  .back-button {
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
</style>
