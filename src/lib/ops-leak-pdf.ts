// The Ops Leak calculator's breakdown, as a one-page A4 PDF. Server only.
//
// Built with pdf-lib and the standard Helvetica faces, so there is no font file
// to ship and nothing native to compile. White page, dark type, one coral rule:
// the site is dark, but this is a document people print and forward.
//
// It is emailed to an address the visitor typed, so it carries NOTHING the
// visitor wrote as free text: no name, no company. Every string on it is
// either fixed copy, a tool name from the fixed list, or a number the model
// computed. A spammer filling the form gets a PDF of numbers sent from
// Gravixar, which is no use to them.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { compute, money, who, type CalcInput } from "./ops-leak";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const WIDTH = A4[0] - MARGIN * 2;

const INK = rgb(0.07, 0.07, 0.08);
const MUTED = rgb(0.38, 0.38, 0.42);
const RULE = rgb(0.85, 0.85, 0.87);
const CORAL = rgb(1, 0.42, 0.21);

// Helvetica's WinAnsi encoding has no glyph for some characters a locale may
// emit (narrow spaces, the dirham's Arabic form). Anything outside it becomes
// a plain space rather than crashing the render.
function safe(text: string): string {
  return text
    .replace(/[   ]/g, " ")
    .replace(/[^\x20-\x7e£×]/g, " ");
}

function wrap(text: string, font: PDFFont, size: number, max: number): string[] {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > max && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderBreakdownPdf(input: CalcInput, at: Date): Promise<Uint8Array> {
  const result = compute(input);
  const m = (n: number) => money(n, input.currency);

  const doc = await PDFDocument.create();
  doc.setTitle("Ops Leak estimate");
  doc.setAuthor("Gravixar");
  doc.setCreator("gravixar.com/ops-leak-calculator");
  doc.setCreationDate(at);

  const page: PDFPage = doc.addPage(A4);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = A4[1] - MARGIN;

  const text = (s: string, x: number, size: number, font = regular, color = INK) =>
    page.drawText(safe(s), { x, y, size, font, color });

  const para = (s: string, size: number, font = regular, color = INK, gap = 1.45, width = WIDTH) => {
    for (const line of wrap(s, font, size, width)) {
      text(line, MARGIN, size, font, color);
      y -= size * gap;
    }
  };

  const rule = (color = RULE, thickness = 0.75) => {
    page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness, color });
  };

  // ---- Header
  page.drawRectangle({ x: MARGIN, y: y - 2, width: 28, height: 3, color: CORAL });
  y -= 22;
  text("GRAVIXAR", MARGIN, 9, bold, MUTED);
  const date = at.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  page.drawText(date, {
    x: A4[0] - MARGIN - regular.widthOfTextAtSize(date, 9),
    y,
    size: 9,
    font: regular,
    color: MUTED,
  });
  y -= 30;
  text("Your Ops Leak estimate", MARGIN, 22, bold);
  y -= 22;
  para(
    "Worked out from the numbers you entered in the Ops Leak calculator at gravixar.com. It is an estimate, not a count.",
    10,
    regular,
    MUTED,
  );

  // ---- The answer
  y -= 16;
  rule();
  y -= 30;
  text(`${m(result.low)} to ${m(result.high)} a month`, MARGIN, 26, bold);
  y -= 20;
  para(
    `${m(result.monthlyCost)} as entered: ${result.weeklyHours} hours a week across a team of ${input.teamSize}, at ${m(input.rate)} an hour.`,
    10.5,
  );

  // ---- The rows, in the audit report's columns
  y -= 18;
  const col = {
    workflow: { title: "Workflow", x: MARGIN, w: 168 },
    who: { title: "Who", x: MARGIN + 176 },
    hours: { title: "Hours a week", x: MARGIN + 248 },
    from: { title: "Counted from", x: MARGIN + 322 },
    cost: { title: "Cost a month", x: MARGIN + 422 },
  };
  for (const c of Object.values(col)) text(c.title, c.x, 8.5, bold, MUTED);
  y -= 8;
  rule();

  const sorted = [...result.rows].sort((a, b) => b.monthlyCost - a.monthlyCost);
  for (const r of sorted) {
    y -= 15;
    const label = wrap(r.short, regular, 9.5, col.workflow.w);
    const top = y;
    label.forEach((line, i) => page.drawText(line, { x: col.workflow.x, y: top - i * 12, size: 9.5, font: regular, color: INK }));
    text(who(r.people), col.who.x, 9.5);
    text(String(r.weeklyHours), col.hours.x, 9.5);
    text("Your estimate", col.from.x, 9.5, regular, MUTED);
    text(m(r.monthlyCost), col.cost.x, 9.5);
    y -= (label.length - 1) * 12 + 8;
    rule();
  }
  y -= 15;
  text("The leak", col.workflow.x, 9.5, bold);
  text(String(result.weeklyHours), col.hours.x, 9.5, bold);
  text(m(result.monthlyCost), col.cost.x, 9.5, bold);

  // ---- What the audit would count
  if (result.top.length > 0) {
    y -= 34;
    text(
      result.top.length === 1 ? "What the audit would count instead" : `Your top ${result.top.length} leaks, and what the audit would count instead`,
      MARGIN,
      12,
      bold,
    );
    y -= 20;
    result.top.forEach((r, i) => {
      text(`${i + 1}.`, MARGIN, 10, bold, CORAL);
      const indent = MARGIN + 16;
      page.drawText(safe(`${r.short}, ${m(r.monthlyCost)} a month.`), { x: indent, y, size: 10, font: bold, color: INK });
      y -= 14;
      for (const line of wrap(r.audit, regular, 10, WIDTH - 16)) {
        page.drawText(line, { x: indent, y, size: 10, font: regular, color: INK });
        y -= 14;
      }
      y -= 6;
    });
  }

  if (input.tools.length > 0) {
    y -= 6;
    para(
      `The tools you named: ${input.tools.join(", ")}. The audit lists each one with its seats, its monthly cost and what it is really used for.`,
      10,
    );
  }

  // ---- How it was worked out
  y -= 14;
  text("How this was worked out", MARGIN, 10, bold);
  y -= 15;
  para(
    `Each row is people, times hours a week each, times ${(52 / 12).toFixed(2)} weeks a month, times your hourly cost, rounded to the nearest 10. The range is a quarter either side of that, because hours remembered from a normal week are rough.`,
    9.5,
    regular,
    MUTED,
  );

  // ---- The next step
  y -= 14;
  rule(CORAL, 1);
  y -= 22;
  text("When you want the real number", MARGIN, 12, bold);
  y -= 18;
  para(
    "The Ops Leak Audit replaces these estimates with a count. I talk to the people who do the work, watch the costliest workflows run, and write each weekly number next to the interview or recording it came from. Then I price the fix, including when the answer is to keep the tool you have.",
    10,
  );
  y -= 4;
  para("$3,500 fixed for one team, with a written report about two weeks after kickoff.", 10, bold);
  y -= 2;
  para("gravixar.com/services/ops-leak-audit", 10, regular, CORAL);

  // ---- Footer
  page.drawText("Qamar, Gravixar  |  gravixar.com  |  gravixar@gmail.com", {
    x: MARGIN,
    y: MARGIN - 12,
    size: 8.5,
    font: regular,
    color: MUTED,
  });

  return doc.save();
}
