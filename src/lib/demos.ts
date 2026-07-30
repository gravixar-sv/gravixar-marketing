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
  /** Scene accent, used for the "for X" tag. */
  accent: string;
  /** Action-button label, scene-specific. */
  openLabel: string;
  /** Real screenshot under /public/scenes. */
  shot: string;
};

export const DEMO_SCENES: DemoScene[] = [
  {
    slug: "lattice",
    name: "Agency OS",
    brand: "Lattice",
    whatItIs: "The operating system a real agency runs on",
    tryLine: "Deliverable review, invoicing, commissions, and leave, all gated.",
    personaLabel: "agencies",
    accent: "#ff6b6b",
    openLabel: "Open the OS",
    shot: "/scenes/lattice.png",
  },
  {
    slug: "studio-mix",
    name: "Agent Console",
    brand: "Studio Mix",
    whatItIs: "A supervised AI-agent console on the Claude API",
    tryLine: "Drafting, screening, and triage, every write behind a human gate.",
    personaLabel: "ops & technical teams",
    accent: "#00e1ff",
    openLabel: "Open the console",
    shot: "/scenes/studio-mix.png",
  },
  {
    slug: "cockpit",
    name: "Founder Cockpit",
    brand: "Driftwood",
    whatItIs: "A run-the-business cockpit for a solo founder",
    tryLine: "Inbox triage, today's priorities, and cash flow, in one view.",
    personaLabel: "founders & small teams",
    accent: "#fbbf24",
    openLabel: "Open the cockpit",
    shot: "/scenes/cockpit.png",
  },
  {
    slug: "northbeam",
    name: "Brand Guardian",
    brand: "Northbeam",
    whatItIs: "A brand agent for a DTC team",
    tryLine: "Brief, on-brand draft, you approve, it learns the rule.",
    personaLabel: "brands & DTC",
    accent: "#9dbe6e",
    openLabel: "Open the workspace",
    shot: "/scenes/northbeam.png",
  },
  {
    slug: "care-ledger",
    name: "Billing & Credentialing",
    brand: "Care Ledger",
    // Matches the demo's own card wording. The demo deliberately withholds the
    // HIPAA adjective on this scene, so marketing does not add it back.
    whatItIs: "A medical billing & credentialing portal",
    tryLine: "Credential a provider, enable billing, close the clinic deal.",
    personaLabel: "healthcare & billing",
    accent: "#2dd4bf",
    openLabel: "Open the portal",
    shot: "/scenes/care-ledger.png",
  },
];
