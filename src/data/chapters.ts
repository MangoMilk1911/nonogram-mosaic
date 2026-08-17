import type { Chapter } from "../lib/nonogram/types";

const modules = import.meta.glob<Chapter>("./chapters/*.json", {
  eager: true,
  import: "default",
});

export const chapters: Chapter[] = Object.values(modules).sort((a, b) =>
  a.id.localeCompare(b.id)
);
