import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

// One button vocabulary for the whole site. Before this file the primary
// action existed at thirteen call sites with six padding pairs and three
// interaction stories, and seven of them shipped pure #000 labels.
//
// Ember Gate rules (2026-09-23):
//   - primary is the ONLY coral fill on a screen: it is the human decision.
//     It reads as a physical key: a lit top edge, a deep shadow, no glow ring.
//   - ghost is neutral at rest AND on hover. It used to turn coral on hover,
//     which put two coral controls side by side and erased the hierarchy.
//   - the press is a transform on the spring curve: it compresses in 100ms
//     and releases with a small overshoot. Transitions are listed explicitly;
//     `transition-all` animated properties that never change.
//   - lg is 44px tall (the touch target) and is the page-level CTA size. The
//     shadow is a compound of primary + lg so dense chrome never gets a lift.
//
// active:scale is reset by the reduced-motion guard in globals.css, which
// resets `scale` as its own property (Tailwind v4 compiles it independently).
export const buttonClass = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium tracking-[-0.005em] transition-[background-color,border-color,color,box-shadow,scale] duration-200 ease-spring active:scale-[0.97] active:duration-100 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-bg shadow-[inset_0_1px_0_rgb(255_255_255/0.28),inset_0_-1px_0_rgb(0_0_0/0.12)] hover:bg-brand-soft",
        ghost:
          "border border-line-strong bg-ink-50/[0.02] text-ink-100 hover:border-ink-400/60 hover:bg-ink-50/[0.06] active:bg-ink-50/[0.08]",
        quiet:
          "text-ink-300 hover:bg-ink-50/[0.05] hover:text-ink-100",
      },
      size: {
        sm: "h-8 px-3 text-[0.8125rem]",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-[0.9375rem]",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        size: "lg",
        class:
          "shadow-[inset_0_1px_0_rgb(255_255_255/0.28),inset_0_-1px_0_rgb(0_0_0/0.12),0_10px_30px_-12px_rgb(230_90_46/0.55)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.34),inset_0_-1px_0_rgb(0_0_0/0.12),0_14px_36px_-12px_rgb(230_90_46/0.6)]",
      },
    ],
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

export type ButtonVariants = VariantProps<typeof buttonClass>;

// Two exports on purpose. `Button` covers real <button> elements; `buttonClass`
// covers everything that is not one, which here is every next/link CTA and the
// one <a download>.
export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariants) {
  return (
    <button
      type={type}
      className={cn(buttonClass({ variant, size }), className)}
      {...props}
    />
  );
}

// The trailing arrow every CTA uses, so the glyph and its nudge are one thing.
// The parent needs `group`.
export function Arrow({ external = false }: { external?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block transition-transform duration-300 ease-out-expo",
        external
          ? "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          : "group-hover:translate-x-1",
      )}
    >
      {external ? "↗" : "→"}
    </span>
  );
}
