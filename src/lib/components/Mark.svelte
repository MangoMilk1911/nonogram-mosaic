<script lang="ts">
  // The brand mark: a 5x5 diamond of glass quarters held by lead, read as
  // both a nonogram cell and a window pane.
  const PATTERN = [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ];

  function hueFor(r: number, c: number): string {
    if (r === 2 && c === 2) return "amber";
    if (r < 2) return "cobalt";
    if (r > 2) return "ruby";
    return c < 2 ? "teal" : "plum";
  }

  export let size = 22;

  const cells = PATTERN.flatMap((row, r) =>
    row.map((on, c) => ({ on: on === 1, hue: hueFor(r, c) }))
  );
</script>

<div
  class="mark"
  style="grid-template-columns: repeat(5, {size}px); grid-template-rows: repeat(5, {size}px); gap: {Math.max(1, Math.round(size / 8))}px; padding: {Math.max(1, Math.round(size / 8))}px;"
>
  {#each cells as cell}
    <div class="cell" style={cell.on ? `background: var(--${cell.hue});` : "background: var(--hollow);"}></div>
  {/each}
</div>

<style>
  .mark {
    display: grid;
    background: var(--lead);
    border-radius: 4px;
    flex: none;
  }
  .cell {
    border-radius: 1px;
  }
</style>
