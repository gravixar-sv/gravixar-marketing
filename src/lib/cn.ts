import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge only knows Tailwind's default scale, so out of the box it read
// the theme's named sizes (text-caption, text-lead, text-display, ...) as TEXT
// COLOURS and silently dropped them whenever a colour class followed:
// twMerge("text-label-sm text-ink-400") returned "text-ink-400". Registering
// them as font sizes makes a size and a colour coexist, as they should.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "statement",
            "page",
            "section",
            "subsection",
            "reference",
            "lead",
            "prose",
            "caption",
            "eyebrow",
            "label",
            "label-sm",
            "label-xs",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
