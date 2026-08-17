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
