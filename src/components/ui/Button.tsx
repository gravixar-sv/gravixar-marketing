import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

// The primary action existed at THIRTEEN call sites before this file, with six
// different padding pairs, two different label colours, and three different
// interaction stories: some had a shadow lift plus a press scale, some had a
// colour transition only, and two had no feedback at all. The same control
// felt like three different controls depending on where you met it.
//
// Two things this fixes that were outright wrong rather than merely
// inconsistent:
//   1. SEVEN call sites shipped `text-black`, which is #000, against the house
//      rule that forbids pure black and white. The site's ground is #0a0a0a
//      and the other six correctly used `text-[#0a0a0a]`, so those seven
//      labels were measurably darker than the surface the fill sits on.
//   2. `not-found.tsx` and the mobile navbar CTA had no transition at all, so
//      they snapped between states while every other button eased.
//
// `class-variance-authority` was already a dependency and had zero importers,
// so this puts something already paid for to work rather than adding a package.
//
// SIZE is a real scale now, not six accidents: sm for an inline control in
// dense chrome, md for a control inside a panel or form step, lg for the
// page-level call to action. The old `px-6 py-3` on the careers apply button
// folds into lg, which is a small shrink on one page and one fewer knob.
//
// The shadow lift is a COMPOUND of primary + lg on purpose. It was deliberate
// polish on the hero and the closing CTA and is worth keeping, but putting it
// on the base would have hung a page-level lift off the navbar button. The
// rule it encodes: a page-level CTA lifts, an inline control does not.
//
// `active:scale-[0.98]` is on the base, so every button presses. It is reset
// by the reduced-motion guard in globals.css, which resets `scale` as its own
// property rather than through `transform` (see the block there; Tailwind v4
// compiles it independently and Lightning CSS will merge a shorthand).
export const buttonClass = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand text-[#0a0a0a] hover:bg-brand-soft",
        ghost:
          "border border-zinc-700 text-zinc-200 hover:border-brand hover:text-brand-soft active:border-brand active:bg-brand/15",
      },
      size: {
        sm: "px-3 py-1.5",
        md: "px-4 py-2.5",
        lg: "px-5 py-2.5",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        size: "lg",
        class:
          "shadow-lg shadow-brand-deep/20 hover:shadow-xl hover:shadow-brand-deep/30",
      },
    ],
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

export type ButtonVariants = VariantProps<typeof buttonClass>;

// Two exports on purpose. `Button` covers real <button> elements; `buttonClass`
// covers everything that is not one, which here is every next/link CTA and the
// one <a download>. A polymorphic `as` prop would buy nothing over passing the
// class, and it would hide which element actually renders.
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
