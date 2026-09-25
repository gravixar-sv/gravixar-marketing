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
// into /public/scenes here, refreshed with the demo repo's `pnpm capture:scenes`
// (which also writes public/scenes/geometry.json there: the measured workspace
// frame and pane boxes every crop below is derived from).
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
 * A region of a scene capture, in the capture's own CSS pixels (every capture
 * is a 1600x1000 view, stored at 1.5x, see Demos.tsx). The frame on the card
 * shows exactly this box, so the crop IS the picture: the scene's workspace
 * (its app window), never the scene's intro copy above it.
 *
 * Boxes come from the demo's measured geometry (public/scenes/geometry.json
 * in gravixar-demo), not from eyeballing: each wraps the workspace frame or a
 * pane, then grows 7% about its centre, because .shot-parallax scales the
 * picture 1.06 inside the frame and would otherwise trim the app's own edge.
 * `wide` is used from md up, `narrow` on phones. Shapes are shared on purpose:
 *   - the first scene is the featured card, and its wide box is the whole
 *     board (3.7:1), all three panes with their action buttons;
 *   - every other wide box is 2.4375:1 (the old 780x320), two panes of the
 *     board, so the 2x2 grid's frames on /demos line up;
 *   - every narrow box is 1.2125:1 (the old 388x320), one pane. The homepage's
 *     follower rows use the narrow box at EVERY width.
 * Keep the Approve-style controls above about 85% of the box height: the
 * frame dissolves into the page over its last 10%. Two captures are staged by
 * the demo's capture script so their pane shows work rather than an idle
 * panel: Studio Mix has run ECHO (a draft waiting for approval), Northbeam has
 * generated the spring promo. Re-check each box by eye after a re-capture.
 */
export type CropBox = { x: number; y: number; w: number; h: number };

export const DEMO_SCENES: DemoScene[] = [
  {
    slug: "lattice",
    name: "Agency OS",
    brand: "Lattice",
    whatItIs: "An operating system for an agency, on sample data",
    tryLine: "Reviews, invoices, commissions, and leave, each one waiting for a yes.",
    personaLabel: "agencies",
    accent: "#ff6b6b",
    openLabel: "Open the OS",
    shot: "/scenes/lattice.png",
    crop: {
      // The whole review board: client, PM and editor panes.
      wide: { x: 64, y: 364, w: 1472, h: 398 },
      narrow: { x: 101, y: 416, w: 492, h: 407 },
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
      // Wide: the agents pane and ECHO's draft waiting for approval. Narrow: the draft with Approve & publish.
      wide: { x: 82, y: 412, w: 1017, h: 417 },
      narrow: { x: 485, y: 454, w: 610, h: 503 },
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
      // Wide: inbox and today. Narrow: today, the draft waiting on Approve & send.
      wide: { x: 84, y: 368, w: 997, h: 409 },
      narrow: { x: 534, y: 416, w: 530, h: 437 },
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
      // Wide: the briefs and the generated promo. Narrow: the promo itself.
      wide: { x: 82, y: 367, w: 1038, h: 426 },
      narrow: { x: 495, y: 414, w: 610, h: 503 },
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
      // Wide: credentialing and the billing gate. Narrow: a provider's credential chips and Verify & credential.
      wide: { x: 84, y: 384, w: 996, h: 409 },
      narrow: { x: 100, y: 432, w: 530, h: 437 },
    },
  },
];
