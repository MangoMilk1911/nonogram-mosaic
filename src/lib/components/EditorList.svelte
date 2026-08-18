<script lang="ts">
  import { customPuzzles, deleteCustomPuzzle } from "../stores/customPuzzles";
  import { currentView, activePuzzleId, activeEditorPuzzleId, editorGridSize } from "../stores/view";

  const presets = [
    { rows: 5, cols: 5 },
    { rows: 8, cols: 8 },
    { rows: 10, cols: 10 },
  ];

  let showNewPuzzleForm = false;
  let customRows: number | null = 8;
  let customCols: number | null = 8;

  function openNewPuzzleForm() {
    showNewPuzzleForm = true;
  }

  function cancelNewPuzzleForm() {
    showNewPuzzleForm = false;
  }

  const clamp = (n: number | null) => Math.min(20, Math.max(3, Math.round(Number(n) || 8)));

  function startNewPuzzle(rows: number | null, cols: number | null) {
    activeEditorPuzzleId.set(null);
    editorGridSize.set({ rows: clamp(rows), cols: clamp(cols) });
    currentView.set("editor");
  }

  function editPuzzle(id: string) {
    activeEditorPuzzleId.set(id);
    const puzzle = $customPuzzles.find((p) => p.id === id);
    if (puzzle) editorGridSize.set(puzzle.size);
    currentView.set("editor");
  }

  function playPuzzle(id: string) {
    activePuzzleId.set(id);
    currentView.set("puzzle");
  }

  function removePuzzle(id: string) {
    void deleteCustomPuzzle(id);
  }

  function backToTitle() {
    currentView.set("titleScreen");
  }
</script>

<div class="screen">
  <button class="back-button" on:click={backToTitle}>&larr; Home</button>
  <h2>My Puzzles</h2>

  {#if $customPuzzles.length === 0 && !showNewPuzzleForm}
    <p class="empty-hint">No puzzles yet — start one below.</p>
  {/if}

  {#if $customPuzzles.length > 0}
    <ul class="puzzle-list">
      {#each $customPuzzles as puzzle (puzzle.id)}
        <li class="puzzle-row">
          <span class="puzzle-title">{puzzle.title}</span>
          <span class="puzzle-size">{puzzle.size.rows}&times;{puzzle.size.cols}</span>
          <span class="puzzle-actions">
            <button on:click={() => playPuzzle(puzzle.id)}>Play</button>
            <button on:click={() => editPuzzle(puzzle.id)}>Edit</button>
            <button class="danger" on:click={() => removePuzzle(puzzle.id)}>Delete</button>
          </span>
        </li>
      {/each}
    </ul>
  {/if}

  {#if showNewPuzzleForm}
    <div class="new-puzzle-form">
      <h3>New Puzzle</h3>
      <div class="presets">
        {#each presets as preset (preset.rows + "x" + preset.cols)}
          <button on:click={() => startNewPuzzle(preset.rows, preset.cols)}>
            {preset.rows}&times;{preset.cols}
          </button>
        {/each}
      </div>
      <div class="custom-size">
        <label>
          Rows
          <input type="number" min="3" max="20" bind:value={customRows} />
        </label>
        <label>
          Cols
          <input type="number" min="3" max="20" bind:value={customCols} />
        </label>
        <button on:click={() => startNewPuzzle(customRows, customCols)}>Start</button>
      </div>
      <button class="back-button" on:click={cancelNewPuzzleForm}>Cancel</button>
    </div>
  {:else}
    <button class="new-puzzle-button" on:click={openNewPuzzleForm}>New Puzzle</button>
  {/if}
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: calc(100vh - 6rem);
    padding: 1.5rem 1.75rem;
  }
  .back-button {
    align-self: flex-start;
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
  .empty-hint {
    color: var(--muted);
  }
  .puzzle-list {
    list-style: none;
    margin: 0.5rem 0;
    padding: 0;
    width: 100%;
    max-width: 32rem;
  }
  .puzzle-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--hair);
    border-radius: var(--radius-md);
    background: var(--panel);
    margin-bottom: 0.6rem;
  }
  .puzzle-title {
    font-family: var(--font-heading);
    font-weight: 600;
    flex: 1;
  }
  .puzzle-size {
    color: var(--muted);
    font-size: 0.85rem;
  }
  .puzzle-actions {
    display: flex;
    gap: 0.4rem;
  }
  .puzzle-actions button {
    font-family: var(--font-body);
    font-weight: 600;
    color: var(--ink);
    background: var(--hollow);
    border: 1px solid var(--hair);
    border-radius: var(--radius-md);
    padding: 0.35rem 0.75rem;
    cursor: pointer;
  }
  .puzzle-actions .danger {
    color: var(--ruby);
  }
  .new-puzzle-button {
    margin-top: 1rem;
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1.05rem;
    color: #fff;
    background: var(--amber);
    border: none;
    border-radius: var(--radius-md);
    padding: 0.65rem 1.75rem;
    cursor: pointer;
  }
  .new-puzzle-button:hover {
    background: var(--ruby);
  }
  .new-puzzle-form {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem;
    border: 1px solid var(--hair);
    border-radius: var(--radius-lg);
    background: var(--panel);
  }
  .presets,
  .custom-size {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .presets button,
  .custom-size button {
    font-family: var(--font-body);
    font-weight: 600;
    color: var(--ink);
    background: var(--hollow);
    border: 1px solid var(--hair);
    border-radius: var(--radius-md);
    padding: 0.5rem 0.9rem;
    cursor: pointer;
  }
  .custom-size label {
    display: flex;
    flex-direction: column;
    font-size: 0.8rem;
    color: var(--muted);
    gap: 0.2rem;
  }
  .custom-size input {
    width: 3.5rem;
    padding: 0.3rem;
    border: 1px solid var(--hair);
    border-radius: var(--radius-md);
    background: var(--bg);
    color: var(--ink);
  }
</style>
