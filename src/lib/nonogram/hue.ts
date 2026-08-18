// The six flat jewel tones from the visual identity, each bound to a CSS
// custom property of the same name (--ruby, --plum, etc). A puzzle keeps a
// single hue for its whole solution so a finished mosaic reads as separate
// panes of glass rather than a uniform picture.
export const HUES = ["ruby", "plum", "amber", "cobalt", "teal", "rose"] as const;
export type Hue = (typeof HUES)[number];

export function tileHue(tileIndex: number): Hue {
  return HUES[tileIndex % HUES.length];
}
