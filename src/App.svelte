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

<div class="app-shell">
  <header class="app-header">
    <button class="brand" on:click={goHome}>
      <Mark size={20} />
      <span class="wordmark">nonogram mosaic</span>
    </button>
    <button class="theme-toggle" on:click={toggleTheme}>
      {$dark ? "Daylight" : "Backlit"}
    </button>
  </header>
  <main>
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
  </main>
</div>

<style>
  .app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem 1.75rem;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .wordmark {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1.35rem;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .theme-toggle {
    font-family: var(--font-heading);
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--ink);
    background: transparent;
    border: 1px solid var(--hair);
    border-radius: var(--radius-md);
    padding: 0.5rem 1rem;
    cursor: pointer;
  }
  .theme-toggle:hover {
    background: var(--hollow);
  }
  main {
    flex: 1;
  }
</style>
