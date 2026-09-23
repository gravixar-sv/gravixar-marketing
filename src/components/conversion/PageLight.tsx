import { cn } from "@/lib/cn";
import styles from "./PageLight.module.css";

// Light from above the fold for an inner page, sitting behind its PageHeader.
// The parent needs `relative isolate` so the layer stays behind the content
// but above the body's own background. Static: it never moves, so it needs no
// reduced-motion rule.
export function PageLight({
  centered = false,
  className,
}: {
  centered?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -inset-x-6 -top-28 -z-10 h-[38rem] md:-top-32",
        centered ? styles.center : "ember-horizon",
        styles.feather,
        className,
      )}
    />
  );
}
