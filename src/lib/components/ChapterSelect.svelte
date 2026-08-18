<script lang="ts">
  import { chapters } from "../../data/chapters";
  import { puzzles } from "../../data/puzzles";
  import { progress } from "../stores/progress";
  import { currentView, activePuzzleId, activeChapterId } from "../stores/view";
  import { isChapterComplete, isChapterUnlocked } from "../nonogram/chapterStatus";
  import { tileHue } from "../nonogram/hue";
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

<div class="screen">
  {#if selectedChapter}
    <div class="puzzle-list">
      <button class="back-button" on:click={backToChapters}>&larr; Chapters</button>
      <h2>{selectedChapter.title}</h2>
      <div class="puzzle-grid">
        {#each selectedChapter.tiles as tileId, i (tileId)}
          {@const done = $progress.completed.includes(tileId)}
          <button class="puzzle-button" class:done on:click={() => openPuzzle(tileId)}>
            {done ? `✓ ${i + 1}` : i + 1}
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
                hue={tileHue(i)}
                cellSize={6}
              />
            {/each}
          </div>
          <span class="chapter-title">{chapter.title}{complete ? " ✓" : ""}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 6rem);
    padding: 1.5rem 1.75rem;
  }
  .chapter-grid,
  .puzzle-grid {
    display: grid;
    grid-template-columns: repeat(3, auto);
    gap: 1.5rem;
  }
  .chapter-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.85rem;
    padding: 1.25rem;
    border: 1px solid var(--hair);
    border-radius: var(--radius-lg);
    background: var(--panel);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
  }
  .chapter-card:not(.locked):hover {
    box-shadow: var(--shadow-md);
  }
  .chapter-card.locked {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .chapter-title {
    font-family: var(--font-heading);
    font-weight: 600;
    color: var(--ink);
  }
  .mosaic-grid {
    display: grid;
    grid-template-columns: repeat(3, max-content);
    gap: 2px;
    background: var(--lead);
    padding: 2px;
    border-radius: 4px;
  }
  .puzzle-button {
    width: 3.25rem;
    height: 3.25rem;
    font-family: var(--font-heading);
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--ink);
    background: var(--panel);
    border: 1px solid var(--hair);
    border-radius: var(--radius-md);
    cursor: pointer;
  }
  .puzzle-button:hover {
    background: var(--hollow);
  }
  .puzzle-button.done {
    background: var(--teal);
    border-color: var(--teal);
    color: #fff;
  }
  .back-button {
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
  .puzzle-list {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>
