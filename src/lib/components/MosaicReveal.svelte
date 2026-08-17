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
