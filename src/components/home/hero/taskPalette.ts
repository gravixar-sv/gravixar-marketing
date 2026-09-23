// The four task categories of the hero's approval loop, and their one colour
// each. A plain module (no "use client") so the panel, the DOM layer over the
// scene, the server-rendered SVG still and the three.js core all read the
// same values.
//
// A PALETTE EXTENSION, BOUNDED TO THE HERO (2026-09-23). Ember Gate keeps
// coral for a human decision, so category can never be coral, red or orange.
// These four are muted to sit on warm ink: each clears 6:1 on the surface, so
// a label set in its hue would still pass AA, but the site uses them only as
// a card's top strip, its small glyph and a chip's dot, never as body text.
// Amber is the one near neighbour of coral, so it runs yellower and far less
// saturated (#c9a15a against #ff6b35), and the "approved" state repaints the
// whole card coral, strip included, so the two never sit side by side on one
// card.
//
// `glyph` indexes the small icon the card shader draws (see loopSceneCore.ts):
// 0 envelope, 1 browser window, 2 speech bubble, 3 form.

export type CategoryKey = "email" | "website" | "social" | "portal";

export const CATEGORIES: Record<
  CategoryKey,
  { label: string; long: string; hex: string; rgb: readonly [number, number, number]; glyph: 0 | 1 | 2 | 3 }
> = {
  email: { label: "Email", long: "Email", hex: "#86a6cf", rgb: [0x86, 0xa6, 0xcf], glyph: 0 },
  website: { label: "Website", long: "Website", hex: "#6aae9c", rgb: [0x6a, 0xae, 0x9c], glyph: 1 },
  social: { label: "LinkedIn", long: "Social (LinkedIn)", hex: "#a08bd0", rgb: [0xa0, 0x8b, 0xd0], glyph: 2 },
  portal: { label: "Portal", long: "Portal intake", hex: "#c9a15a", rgb: [0xc9, 0xa1, 0x5a], glyph: 3 },
};
