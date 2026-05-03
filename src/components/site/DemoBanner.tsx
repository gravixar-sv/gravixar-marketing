// Top-of-site banner pointing visitors at the demo subdomain. Softer
// styling than the previous solid-fill version — dark background with a
// thin brand-accent top line. Reduces overall "redness" surface area.

export function DemoBanner() {
  return (
    <div className="border-y border-brand/20 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-6 py-2 text-xs text-zinc-300 md:text-sm">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand pulse-dot" />
        <span className="hidden md:inline">Live ops platform coming online at</span>
        <span className="md:hidden">Demo at</span>
        <a
          href="https://demo.gravixar.com"
          className="font-medium text-brand-soft underline-offset-4 hover:underline"
          rel="noreferrer"
        >
          demo.gravixar.com
        </a>
        <span className="hidden text-zinc-500 md:inline">— click around as a real client.</span>
      </div>
    </div>
  );
}
