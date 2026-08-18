<script lang="ts">
  import type { Hue } from "../nonogram/hue";

  export let solution: number[][] | null;
  export let label: number;
  export let hue: Hue = "cobalt";
  export let cellSize = 4;
</script>

<div class="mosaic-tile" class:placeholder={!solution}>
  {#if solution}
    <div
      class="tile-grid"
      style="grid-template-columns: repeat({solution[0].length}, {cellSize}px); grid-template-rows: repeat({solution.length}, {cellSize}px);"
    >
      {#each solution as row}
        {#each row as cell}
          <div class="tile-cell" style={cell === 1 ? `background: var(--${hue});` : ""}></div>
        {/each}
      {/each}
    </div>
  {:else}
    <span class="tile-number">{label}</span>
  {/if}
</div>

<style>
  .mosaic-tile {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--hollow);
    aspect-ratio: 1;
  }
  .mosaic-tile.placeholder {
    color: var(--muted);
    font-family: var(--font-heading);
    font-weight: 600;
  }
  .tile-grid {
    display: grid;
  }
  .tile-number {
    font-size: 1.1rem;
  }
</style>
