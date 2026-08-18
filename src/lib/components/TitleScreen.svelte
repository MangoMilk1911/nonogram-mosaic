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

<div class="title-screen">
  <Mark size={40} />
  <h1>nonogram mosaic</h1>
  <p class="tagline">Stained glass, built one solved puzzle at a time.</p>
  <div class="title-actions">
    <button class="play-button" on:click={play}>Play</button>
    <button class="create-button" on:click={create}>Create</button>
  </div>
</div>

<style>
  .title-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    min-height: calc(100vh - 6rem);
    text-align: center;
  }
  h1 {
    margin: 0.5rem 0 0;
  }
  .tagline {
    margin: 0;
    color: var(--muted);
    font-size: 1.05rem;
  }
  .title-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }
  .play-button {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1.1rem;
    color: #fff;
    background: var(--amber);
    border: none;
    border-radius: var(--radius-md);
    padding: 0.75rem 2.25rem;
    cursor: pointer;
  }
  .play-button:hover {
    background: var(--ruby);
  }
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
</style>
