import { writable } from "svelte/store";

const STORAGE_KEY = "nonogram-mosaic:dark";

export const dark = writable(false);

function applyDark(isDark: boolean): void {
  document.documentElement.toggleAttribute("data-dark", isDark);
}

export function initTheme(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  const isDark = stored !== null ? stored === "1" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  dark.set(isDark);
  applyDark(isDark);
}

export function toggleTheme(): void {
  dark.update((current) => {
    const next = !current;
    applyDark(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    return next;
  });
}
