// Regenerates src/fonts/brand-sans-latin.woff2: Mona Sans Variable (latin,
// wdth + wght, from @fontsource-variable/mona-sans) trimmed to the weights and
// widths this site sets. Not part of the build; run it by hand when the type
// needs a weight or width outside the ranges below, then update the
// `weight` and `font-stretch` in src/app/layout.tsx to match.
//
// subset-font is not a dependency of this repo, so install it somewhere else
// and run this from there:
//   mkdir %TEMP%\fonttool && cd %TEMP%\fonttool && npm i subset-font@2.9.0
//   node <repo>\scripts\trim-brand-font.mjs <repo>
//
// 2026-10-10, subset-font 2.9.0 (harfbuzzjs 1.6.3), @fontsource-variable/
// mona-sans 5.2.8: 98,124 bytes in, 55,620 out.

import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const repo = process.argv[2];
if (!repo) throw new Error("usage: node trim-brand-font.mjs <repo root>");

// Resolved from the current folder, where subset-font was installed.
const subsetFont = createRequire(join(process.cwd(), "noop.js"))("subset-font");

const AXES = { wght: { min: 400, max: 700 }, wdth: { min: 94, max: 100 } };

// Fontsource's latin unicode-range, plus the arrows the CTAs use.
const RANGES = [
  [0x0000, 0x00ff], [0x0131, 0x0131], [0x0152, 0x0153], [0x02bb, 0x02bc], [0x02c6, 0x02c6],
  [0x02da, 0x02da], [0x02dc, 0x02dc], [0x0304, 0x0304], [0x0308, 0x0308], [0x0329, 0x0329],
  [0x2000, 0x206f], [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2190, 0x2199], [0x2212, 0x2212],
  [0x2215, 0x2215], [0xfeff, 0xfeff], [0xfffd, 0xfffd],
];

let text = "";
for (const [a, b] of RANGES) for (let c = a; c <= b; c++) text += String.fromCodePoint(c);

const input = join(repo, "node_modules/@fontsource-variable/mona-sans/files/mona-sans-latin-wdth-normal.woff2");
const output = join(repo, "src/fonts/brand-sans-latin.woff2");
const src = readFileSync(input);
const out = await subsetFont(src, text, { targetFormat: "woff2", variationAxes: AXES });
writeFileSync(output, out);
console.log(`${src.length} bytes in, ${out.length} out: ${output}`);
