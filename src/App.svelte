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
