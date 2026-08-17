import { writable } from "svelte/store";

export type ViewName = "chapterSelect" | "puzzle" | "mosaicReveal";

export const currentView = writable<ViewName>("chapterSelect");
export const activePuzzleId = writable<string | null>(null);
export const activeChapterId = writable<string | null>(null);
