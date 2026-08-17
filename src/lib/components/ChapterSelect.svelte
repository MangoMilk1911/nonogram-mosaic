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
