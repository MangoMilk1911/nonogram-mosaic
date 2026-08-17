import type { Chapter } from "./types";

export function isChapterComplete(chapter: Chapter, completed: string[]): boolean {
  return chapter.tiles.every((id) => completed.includes(id));
}

export function isChapterUnlocked(
  chapterIndex: number,
  chapters: Chapter[],
  completed: string[]
): boolean {
  if (chapterIndex === 0) return true;
  return isChapterComplete(chapters[chapterIndex - 1], completed);
}
