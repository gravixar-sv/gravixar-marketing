// Build-time gate: no public form may send personal data in a URL. Runs in
// prebuild.
//
// The lead forms submit through onSubmit + fetch, but that handler only exists
// once React has hydrated. A submit before then (slow network, a big bundle,
// JS blocked) is a NATIVE submission, and a <form> with no `method` is a GET:
// the browser puts every NAMED field (name, email, message, phone) in the
// query string, and the URL lands in Vercel's request logs, browser history
// and any analytics that records page URLs. `method="post"` keeps the fields
// in the request body.
//
// And NO `encType`, even on a form with a file input. Next 16 treats a
// multipart POST to a page as a server-action call. With no action id it
// fails: `next start` on 16.3.4 answers 404 "Server action not found." and
// logs "Failed to find Server Action" (another Gravixar app saw a 500). A
// default url-encoded POST re-renders the page with a 200. With JS on, the
// forms build their own request (JobApplicationForm sends the CV as its own
// FormData), so the attribute buys nothing and breaks the pre-hydration case.
//
// Two checks:
//   1. Source scan. Every <form> in src/ whose JSX contains an element with a
//      `name` attribute must say method="post" and must not set encType. A
//      form with no named field submits nothing, so it is listed as skipped
//      rather than failed. This catches a new form as well as a regression in
//      an old one.
//   2. Render. The four lead forms are rendered to HTML, which is what the
//      browser gets before hydration, and their <form> tag must carry
//      method="post", no enctype, alongside the named fields.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const failures: string[] = [];
function check(ok: boolean, name: string, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) {
    if (detail !== undefined) console.log(`      ${JSON.stringify(detail)}`);
    failures.push(name);
  }
}

const ROOT = join(__dirname, "..");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) return tsxFiles(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

type Tag = ts.JsxOpeningElement | ts.JsxSelfClosingElement;

function attr(tag: Tag, name: string): ts.JsxAttribute | undefined {
  return tag.attributes.properties.find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === name,
  );
}

function literal(a: ts.JsxAttribute | undefined): string | undefined {
  const init = a?.initializer;
  return init && ts.isStringLiteral(init) ? init.text : undefined;
}

/** Every `name="..."` / `name={...}` inside a form's JSX, by the tag it sits on. */
function namedFields(form: ts.JsxElement): string[] {
  const found: string[] = [];
  const visit = (n: ts.Node) => {
    if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && attr(n, "name")) {
      found.push(`${n.tagName.getText()} ${literal(attr(n, "name")) ?? "{expr}"}`);
    }
    ts.forEachChild(n, visit);
  };
  form.children.forEach(visit);
  return found;
}

/** Attributes that override the form's own method or encoding for one
 *  submit button (`formMethod="get"` would bring the GET back). */
function buttonOverrides(form: ts.JsxElement): string[] {
  const found: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      for (const p of n.attributes.properties) {
        if (ts.isJsxAttribute(p) && /^form(method|enctype)$/i.test(p.name.getText())) {
          found.push(`${n.tagName.getText()} ${p.name.getText()}`);
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  form.children.forEach(visit);
  return found;
}

// 1. Source scan.
const forms: { where: string; method?: string; encType: boolean; overrides: string[]; named: string[] }[] = [];
for (const file of tsxFiles(join(ROOT, "src"))) {
  const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (n: ts.Node) => {
    if (ts.isJsxElement(n) && n.openingElement.tagName.getText() === "form") {
      const line = src.getLineAndCharacterOfPosition(n.getStart()).line + 1;
      forms.push({
        where: `${relative(ROOT, file).replaceAll("\\", "/")}:${line}`,
        method: literal(attr(n.openingElement, "method"))?.toLowerCase(),
        encType: n.openingElement.attributes.properties.some(
          (p) => ts.isJsxAttribute(p) && p.name.getText().toLowerCase() === "enctype",
        ),
        overrides: buttonOverrides(n),
        named: namedFields(n),
      });
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
}

// A scanner that finds nothing would pass everything, so pin the floor.
check(forms.length >= 7, `source scan found the site's forms (${forms.length})`);
for (const f of forms) {
  if (f.named.length === 0) {
    console.log(`SKIP  ${f.where}: no named field, so a native submit sends nothing`);
    continue;
  }
  check(f.method === "post", `${f.where}: method="post" (named: ${f.named.join(", ")})`, { method: f.method ?? null });
  check(!f.encType, `${f.where}: no encType (a multipart page POST is a failed server-action call)`);
  check(f.overrides.length === 0, `${f.where}: no submit button overrides the method or encoding`, f.overrides);
}

// 2. Render.
async function main() {
  const { ContactForm } = await import("../src/components/lead/ContactForm");
  const { EarlyAccessForm } = await import("../src/components/lead/EarlyAccessForm");
  const { ServiceInquiryForm } = await import("../src/components/lead/ServiceInquiryForm");
  const { JobApplicationForm } = await import("../src/components/lead/JobApplicationForm");

  const rendered: [string, ComponentType<never>, object, string[]][] = [
    ["ContactForm", ContactForm as ComponentType<never>, {}, ["name", "email", "message"]],
    ["EarlyAccessForm", EarlyAccessForm as ComponentType<never>, {}, ["email"]],
    [
      "ServiceInquiryForm",
      ServiceInquiryForm as ComponentType<never>,
      { sourcePage: "/services/ai-tooling", serviceTitle: "AI tooling" },
      ["name", "email", "message"],
    ],
    [
      "JobApplicationForm",
      JobApplicationForm as ComponentType<never>,
      { sourcePage: "/careers/selftest", roleTitle: "Selftest role" },
      ["name", "email", "phone", "message"],
    ],
  ];
  for (const [label, Component, props, fields] of rendered) {
    const html = renderToStaticMarkup(createElement(Component, props as never));
    const formTag = html.match(/<form\b[^>]*>/)?.[0] ?? "";
    const missing = fields.filter((f) => !html.includes(`name="${f}"`));
    check(missing.length === 0, `${label}: renders its named fields`, { missing });
    check(/\smethod="post"/.test(formTag), `${label}: rendered <form> carries method="post"`, formTag);
    check(!/\senctype=/i.test(formTag), `${label}: rendered <form> has no enctype`, formTag);
    check(!/\sform(method|enctype)=/i.test(html), `${label}: no rendered button overrides method or encoding`);
  }
}

main()
  .then(() => {
    if (failures.length > 0) {
      console.error(`\nform method selftest: ${failures.length} failure(s)`);
      process.exit(1);
    }
    console.log("\nform method selftest: ok");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
