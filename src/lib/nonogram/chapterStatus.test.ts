import { describe, it, expect } from "vitest";
import { isChapterComplete, isChapterUnlocked } from "./chapterStatus";
import type { Chapter } from "./types";

const ch1: Chapter = {
  id: "ch1",
  title: "Chapter 1",
  mosaicSize: { rows: 3, cols: 3 },
  tiles: ["ch1-p1", "ch1-p2", "ch1-p3"],
};
const ch2: Chapter = {
  id: "ch2",
  title: "Chapter 2",
  mosaicSize: { rows: 3, cols: 3 },
  tiles: ["ch2-p1", "ch2-p2", "ch2-p3"],
};
const chapters = [ch1, ch2];

describe("isChapterComplete", () => {
  it("is true only when every tile id is in completed", () => {
    expect(isChapterComplete(ch1, ["ch1-p1", "ch1-p2", "ch1-p3"])).toBe(true);
    expect(isChapterComplete(ch1, ["ch1-p1", "ch1-p2"])).toBe(false);
  });
});

describe("isChapterUnlocked", () => {
  it("the first chapter is always unlocked", () => {
    expect(isChapterUnlocked(0, chapters, [])).toBe(true);
  });

  it("a later chapter unlocks only once the previous one is complete", () => {
    expect(isChapterUnlocked(1, chapters, [])).toBe(false);
    expect(isChapterUnlocked(1, chapters, ["ch1-p1", "ch1-p2", "ch1-p3"])).toBe(true);
  });
});
