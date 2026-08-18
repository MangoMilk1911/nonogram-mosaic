import { writable } from "svelte/store";

export type ViewName =
  | "titleScreen"
  | "chapterSelect"
  | "puzzle"
  | "mosaicReveal"
  | "editorList"
  | "editor";

export const currentView = writable<ViewName>("titleScreen");
export const activePuzzleId = writable<string | null>(null);
export const activeChapterId = writable<string | null>(null);
export const activeEditorPuzzleId = writable<string | null>(null);
export const editorGridSize = writable<{ rows: number; cols: number }>({ rows: 8, cols: 8 });
