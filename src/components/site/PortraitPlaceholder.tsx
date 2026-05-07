// Placeholder for the About-page portrait. Sits in the right column on
// large screens. When a real photo is ready, replace this component
// with a Next/Image of `public/about/qamar.jpg` (or wherever the asset
// lands) — same outer wrapper + aspect ratio, just swap the inside.

export function PortraitPlaceholder() {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/40">
      {/* Subtle dot grid texture, picks up the site's existing
          bg-dot-grid utility so the placeholder doesn't look orphan. */}
      <div
        aria-hidden
        className="bg-dot-grid pointer-events-none absolute inset-0 opacity-50"
      />
      <div className="relative flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700/70 bg-zinc-900/60 font-mono text-sm text-zinc-500"
        >
          Q
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          photo · soon
        </p>
      </div>
    </div>
  );
}
