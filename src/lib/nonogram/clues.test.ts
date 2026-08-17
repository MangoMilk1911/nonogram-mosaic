import { describe, it, expect } from "vitest";
import { runLengths, deriveRowClues, deriveColClues, cluesEqual } from "./clues";

describe("runLengths", () => {
  it("encodes a single run", () => {
    expect(runLengths([0, 1, 1, 1, 0])).toEqual([3]);
  });

  it("encodes multiple runs", () => {
    expect(runLengths([1, 1, 0, 1, 0, 0, 1])).toEqual([2, 1, 1]);
  });

  it("encodes an empty line as [0]", () => {
    expect(runLengths([0, 0, 0, 0])).toEqual([0]);
  });

  it("encodes a fully-filled line as a single run", () => {
    expect(runLengths([1, 1, 1, 1])).toEqual([4]);
  });

  it("encodes a run touching the end of the line", () => {
    expect(runLengths([0, 0, 1, 1])).toEqual([2]);
  });
});

describe("deriveRowClues", () => {
  it("derives one clue array per row", () => {
    const solution = [
      [1, 1, 0],
      [0, 0, 0],
      [1, 0, 1],
    ];
    expect(deriveRowClues(solution)).toEqual([[2], [0], [1, 1]]);
  });
});

describe("deriveColClues", () => {
  it("derives one clue array per column", () => {
    const solution = [
      [1, 1, 0],
      [0, 0, 0],
      [1, 0, 1],
    ];
    expect(deriveColClues(solution)).toEqual([[1, 1], [1], [1]]);
  });
});

describe("cluesEqual", () => {
  it("is true for identical arrays", () => {
    expect(cluesEqual([2, 1], [2, 1])).toBe(true);
  });

  it("is false for different lengths or values", () => {
    expect(cluesEqual([2, 1], [2])).toBe(false);
    expect(cluesEqual([2, 1], [2, 2])).toBe(false);
  });
});
