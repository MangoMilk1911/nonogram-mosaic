import { writable } from "svelte/store";

export type ViewName = "titleScreen" | "chapterSelect" | "puzzle" | "mosaicReveal";

export const currentView = writable<ViewName>("titleScreen");
export const activePuzzleId = writable<string | null>(null);
export const activeChapterId = writable<string | null>(null);
