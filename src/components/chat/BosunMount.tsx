"use client";

// Thin client wrapper so the marketing layout can stay a server component.
// The only thing Bosun needs from the router is the route it was opened from,
// which is both the opener selector and the one field on the miss row.
//
// The panel's code loads on the first open, not with the page. Until then the
// page carries only the launcher (BosunLauncher). The panel was about 35 KB of
// script (10 KB compressed) downloaded and run on every page before the first
// paint, for a widget most visitors never open. Hover, focus or touch on the
// launcher starts the download, so by the time the click lands it is usually
// there; the click then mounts Bosun already open. 2026-10-10, HQ brain task
// marketing-mobile-lcp-fixes.

import { useCallback, useRef, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";
import { BosunLauncher } from "./BosunLauncher";

type BosunComponent = ComponentType<{ sourcePage: string; defaultOpen?: boolean }>;

export function BosunMount() {
  const pathname = usePathname();
  const [Panel, setPanel] = useState<BosunComponent | null>(null);
  const [opening, setOpening] = useState(false);
  const loading = useRef<Promise<BosunComponent> | null>(null);

  const load = useCallback(() => {
    loading.current ??= import("./Bosun").then((m) => m.Bosun);
    return loading.current;
  }, []);

  const open = useCallback(() => {
    if (opening) return;
    setOpening(true);
    load()
      // A component is itself a function, so it goes into state via a setter
      // function rather than being called as one.
      .then((C) => setPanel(() => C))
      .catch(() => {
        // The chunk failed to load (offline, a deploy mid-visit). Leave the
        // launcher so a second click can try again.
        loading.current = null;
        setOpening(false);
      });
  }, [load, opening]);

  if (Panel) return <Panel sourcePage={pathname ?? "/"} defaultOpen />;
  return <BosunLauncher onOpen={open} onIntent={() => void load()} busy={opening} />;
}
