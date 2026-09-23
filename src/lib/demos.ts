// The live scenes on demo.gravixar.com, one buyer per scene. Slugs, descriptor
// names, product sub-names, personas and action labels match the live demo's
// scene gallery one for one (the deployed site is the source of truth; the demo
// repo's local main can lag). The tryLine copy is paraphrased into this site's
// house style: the demo writes those lines with arrows and no closing period,
// so a wording difference there is deliberate, not drift. Each card leads with
// the scene's descriptor name and carries its product sub-name, exactly as the
// demo presents it. Re-confirm names, slugs, personas, and that each link
// resolves before publishing changes, and never let a card here claim more than
// the demo's own card claims.
//
// Screenshots are real captures pulled from the live demo's /scenes/<slug>.png
// into /public/scenes here, refreshed with the demo repo's `pnpm capture`.
// Re-capture whenever the demo has a visual pass, or these cards quietly
// advertise a version of the product that no longer exists.
//
// Five scenes, and only five. A scene is listed here only once it is genuinely
// clickable. Verus Partners was previously described here as "coming online
// and intentionally not listed until it is live", but it was in fact named on
// the demo index and on /demos for five weeks against a 404, so it has been
// removed from the demo's scene registry entirely and is not named on any
// public surface. Roadmap scenes live in the brain.

export type DemoScene = {
  slug: string;
  /** Descriptor name, the card's heading (e.g. "Agency OS"). */
  name: string;
  /** Product sub-name shown next to the descriptor (e.g. "Lattice"). */
  brand: string;
  /** Plain-English "what this is". */
  whatItIs: string;
  /** One concrete line: what a visitor actually does in the scene. */
  tryLine: string;
  /** The buyer this scene is built for. */
  personaLabel: string;
  /** Scene accent from the demo's registry. Not rendered here since
   *  2026-09-23: the cards are neutral and the screenshots carry the colour. */
  accent: string;
  /** Action-button label, scene-specific. */
  openLabel: string;
  /** Real screenshot under /public/scenes. */
  shot: string;
  /** Which part of the capture the card frame shows. See CropBox. */
  crop: { wide: CropBox; narrow: CropBox };
};

/**
 * A region of a scene capture, in the capture's own pixels (every capture is
 * 1600x738, see Demos.tsx). The frame on the card shows exactly this box, so
 * the crop IS the picture: pick the working board, never the scene's intro
 * copy (its eyebrow, headline and paragraph are the demo describing itself,
 * and as a picture of text they read as noise at card size).
 *
 * `wide` is used from md up, `narrow` on phones, where one column of the app
 * renders close to 1:1 and stays readable. Shapes are shared on purpose:
 *   - the first scene is the featured card, and its wide box is the whole
 *     board (about 3.7:1), the three columns with their action buttons;
 *   - every other wide box is 780x320, so the 2x2 grid's frames line up;
 *   - every narrow box is 388x320.
 * Keep the Approve-style controls above about 85% of the box height: the
 * frame dissolves into the page over its last 10%.
 * Re-check each box by eye after every `pnpm capture` in the demo repo.
 */
export type CropBox = { x: number; y: number; w: number; h: number };

export const DEMO_SCENES: DemoScene[] = [
  {
    slug: "lattice",
    name: "Agency OS",
    brand: "Lattice",
    whatItIs: "The operating system a real agency runs on",
    tryLine: "Reviews, invoices, commissions, and leave, each one waiting for a yes.",
    personaLabel: "agencies",
    accent: "#ff6b6b",
    openLabel: "Open the OS",
    shot: "/scenes/lattice.png",
    crop: {
      wide: { x: 196, y: 385, w: 1208, h: 330 },
      narrow: { x: 200, y: 392, w: 388, h: 320 },
    },
  },
  {
    slug: "studio-mix",
    name: "Agent Console",
    brand: "Studio Mix",
    whatItIs: "A supervised AI-agent console on the Claude API",
    tryLine: "It drafts, screens, and sorts, and a person approves every action.",
    personaLabel: "ops & technical teams",
    accent: "#00e1ff",
    openLabel: "Open the console",
    shot: "/scenes/studio-mix.png",
    crop: {
      wide: { x: 200, y: 418, w: 780, h: 320 },
      narrow: { x: 172, y: 418, w: 388, h: 320 },
    },
  },
  {
    slug: "cockpit",
    name: "Founder Cockpit",
    brand: "Driftwood",
    whatItIs: "A run-the-business cockpit for a solo founder",
    tryLine: "A sorted inbox, today's priorities, and cash flow on one screen.",
    personaLabel: "founders & small teams",
    accent: "#fbbf24",
    openLabel: "Open the cockpit",
    shot: "/scenes/cockpit.png",
    crop: {
      wide: { x: 200, y: 346, w: 780, h: 320 },
      narrow: { x: 605, y: 346, w: 388, h: 320 },
    },
  },
  {
    slug: "northbeam",
    name: "Brand Guardian",
    brand: "Northbeam",
    whatItIs: "A brand agent for a DTC team",
    tryLine: "You brief it, it drafts on brand, you approve, and it learns the rule.",
    personaLabel: "brands & DTC",
    accent: "#9dbe6e",
    openLabel: "Open the workspace",
    shot: "/scenes/northbeam.png",
    crop: {
      wide: { x: 590, y: 395, w: 780, h: 320 },
      narrow: { x: 1010, y: 395, w: 388, h: 320 },
    },
  },
  {
    slug: "care-ledger",
    name: "Billing & Credentialing",
    brand: "Care Ledger",
    // Matches the demo's own card wording. The demo deliberately withholds the
    // HIPAA adjective on this scene, so marketing does not add it back.
    whatItIs: "A medical billing & credentialing portal",
    tryLine: "Credential a provider, turn on billing, and close the clinic deal.",
    personaLabel: "healthcare & billing",
    accent: "#2dd4bf",
    openLabel: "Open the portal",
    shot: "/scenes/care-ledger.png",
    crop: {
      wide: { x: 605, y: 410, w: 780, h: 320 },
      narrow: { x: 1006, y: 410, w: 388, h: 320 },
    },
  },
];
