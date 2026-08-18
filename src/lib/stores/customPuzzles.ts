import { writable } from "svelte/store";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import type { CustomPuzzle } from "../nonogram/types";

const CUSTOM_PUZZLES_FILE = "custom-puzzles.json";

export const customPuzzles = writable<CustomPuzzle[]>([]);

export function upsertCustomPuzzle(list: CustomPuzzle[], puzzle: CustomPuzzle): CustomPuzzle[] {
  const index = list.findIndex((p) => p.id === puzzle.id);
  if (index === -1) return [...list, puzzle];
  const next = list.slice();
  next[index] = puzzle;
  return next;
}

export function removeCustomPuzzle(list: CustomPuzzle[], id: string): CustomPuzzle[] {
  return list.filter((p) => p.id !== id);
}

async function customPuzzlesFilePath(): Promise<string> {
  const dir = await appLocalDataDir();
  return join(dir, CUSTOM_PUZZLES_FILE);
}

async function persist(list: CustomPuzzle[]): Promise<void> {
  const dir = await appLocalDataDir();
  await mkdir(dir, { recursive: true });
  const path = await customPuzzlesFilePath();
  await writeTextFile(path, JSON.stringify(list));
}

export async function loadCustomPuzzles(): Promise<void> {
  try {
    const path = await customPuzzlesFilePath();
    if (!(await exists(path))) {
      customPuzzles.set([]);
      return;
    }
    const text = await readTextFile(path);
    const parsed = JSON.parse(text);
    customPuzzles.set(Array.isArray(parsed) ? parsed : []);
  } catch {
    customPuzzles.set([]);
  }
}

export async function saveCustomPuzzle(puzzle: CustomPuzzle): Promise<void> {
  let next: CustomPuzzle[] = [];
  customPuzzles.update((current) => {
    next = upsertCustomPuzzle(current, puzzle);
    return next;
  });
  try {
    await persist(next);
  } catch (error) {
    console.warn("Failed to save custom puzzle:", error);
  }
}

export async function deleteCustomPuzzle(id: string): Promise<void> {
  let next: CustomPuzzle[] = [];
  customPuzzles.update((current) => {
    next = removeCustomPuzzle(current, id);
    return next;
  });
  try {
    await persist(next);
  } catch (error) {
    console.warn("Failed to delete custom puzzle:", error);
  }
}
