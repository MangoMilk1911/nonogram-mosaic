import { writable } from "svelte/store";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import type { Progress } from "../nonogram/types";

const PROGRESS_FILE = "progress.json";

export const progress = writable<Progress>({ completed: [] });

async function progressFilePath(): Promise<string> {
  const dir = await appLocalDataDir();
  return join(dir, PROGRESS_FILE);
}

export async function loadProgress(): Promise<void> {
  try {
    const path = await progressFilePath();
    if (!(await exists(path))) {
      progress.set({ completed: [] });
      return;
    }
    const text = await readTextFile(path);
    const parsed = JSON.parse(text);
    progress.set({
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
    });
  } catch {
    progress.set({ completed: [] });
  }
}

export async function markComplete(puzzleId: string): Promise<void> {
  let next: Progress = { completed: [] };
  progress.update((current) => {
    next = current.completed.includes(puzzleId)
      ? current
      : { completed: [...current.completed, puzzleId] };
    return next;
  });
  try {
    const dir = await appLocalDataDir();
    await mkdir(dir, { recursive: true });
    const path = await progressFilePath();
    await writeTextFile(path, JSON.stringify(next));
  } catch (error) {
    console.warn("Failed to save progress:", error);
  }
}
