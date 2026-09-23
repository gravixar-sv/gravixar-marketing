import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// One field system for every lead form (contact, service inquiry, early
// access, careers, booking). Five hand-rolled forms had four field systems:
// 10 to 11px mono uppercase labels that read like a terminal, 14px inputs that
// made iOS Safari zoom the page on focus, and `outline-none` that cancelled
// the site-wide focus ring, leaving a 1px colour change as the only signal.
//
// The rules this file holds:
//   - labels are sentence-case sans at 14px; "(optional)" is a quiet suffix,
//     not part of a shouted string
//   - inputs are 16px on phones (no iOS zoom) and 15px from md, 44px tall
//   - focus keeps the global coral ring AND lifts the border, so focus is
//     never colour-only
//   - :user-invalid (after the visitor has interacted) draws a warm error
//     border, never on first paint
export const controlClass =
  "block w-full rounded-lg border border-line bg-ink-950/70 px-3.5 text-base text-ink-100 shadow-[inset_0_1px_0_rgb(0_0_0/0.25)] transition-[border-color,background-color] duration-200 placeholder:text-ink-500 hover:border-line-strong focus:border-ink-400/70 focus:bg-ink-950 user-invalid:border-[#f0885f]/70 md:text-[0.9375rem]";

export function FieldLabel({
  children,
  optional,
  htmlFor,
  as: Tag = "span",
}: {
  children: ReactNode;
  optional?: boolean;
  htmlFor?: string;
  as?: "span" | "label" | "legend";
}) {
  return (
    <Tag
      {...(Tag === "label" ? { htmlFor } : {})}
      className="block text-sm font-medium text-ink-200"
    >
      {children}
      {optional ? <span className="ml-1.5 font-normal text-ink-500">(optional)</span> : null}
    </Tag>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <span className="mt-1.5 block text-[0.8125rem] leading-snug text-ink-500">{children}</span>;
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  optional?: boolean;
  hint?: ReactNode;
};

export function TextField({ label, optional, hint, className, ...props }: InputProps) {
  return (
    <label className="block">
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <input {...props} className={cn(controlClass, "mt-2 h-11", className)} />
      {hint ? <FieldHint>{hint}</FieldHint> : null}
    </label>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  optional?: boolean;
  hint?: ReactNode;
};

export function TextArea({ label, optional, hint, className, rows = 5, ...props }: TextareaProps) {
  return (
    <label className="block">
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <textarea {...props} rows={rows} className={cn(controlClass, "mt-2 py-3 leading-relaxed", className)} />
      {hint ? <FieldHint>{hint}</FieldHint> : null}
    </label>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  children: ReactNode;
};

export function SelectField({ label, optional, hint, className, children, ...props }: SelectProps) {
  return (
    <label className="block">
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <span className="relative mt-2 block">
        <select {...props} className={cn(controlClass, "h-11 appearance-none pr-10", className)}>
          {children}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-ink-500"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
      {hint ? <FieldHint>{hint}</FieldHint> : null}
    </label>
  );
}

// Multi-select chips (checkbox group). The chip is the label, so the whole
// pill is the hit area; focus lands on the hidden checkbox and is drawn on the
// chip through peer-focus-visible.
export function ChipGroup({
  legend,
  optional,
  name,
  options,
}: {
  legend: string;
  optional?: boolean;
  name: string;
  options: readonly string[];
}) {
  return (
    <fieldset>
      <FieldLabel as="legend" optional={optional}>
        {legend}
      </FieldLabel>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((t) => (
          <label key={t} className="cursor-pointer">
            <input type="checkbox" name={name} value={t} className="peer sr-only" />
            <span className="inline-flex h-9 items-center rounded-full border border-line bg-ink-950/60 px-3.5 text-sm text-ink-300 transition-[border-color,background-color,color] duration-200 hover:border-line-strong peer-checked:border-brand/60 peer-checked:bg-brand/10 peer-checked:text-ink-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand/80">
              {t}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Human error copy. Forms must never print a machine code to a visitor
// ("Something failed: request_failed_500"). Pass the code for logs, show this.
export function FormError({ children }: { children?: ReactNode }) {
  return (
    <p role="alert" className="fade-up rounded-lg border border-[#f0885f]/25 bg-[#f0885f]/[0.06] px-4 py-3 text-sm text-ink-200">
      {children ?? (
        <>
          That did not send. Try again, or email me at{" "}
          <a href="mailto:gravixar@gmail.com" className="link-quiet">
            gravixar@gmail.com
          </a>
          .
        </>
      )}
    </p>
  );
}

// The confirmation that replaces a form after it sends. Focus moves here (the
// caller passes a ref or uses autoFocus on the heading) so the change is
// announced.
export function FormSuccess({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div role="status" className="fade-up panel-lit rounded-xl p-6">
      <p className="flex items-center gap-2 text-sm font-medium text-ink-100">
        <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-bg">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="m2.5 6.2 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        Sent
      </p>
      <h3 className="mt-3 text-xl font-semibold tracking-[-0.015em] text-ink-50">{title}</h3>
      {children ? <div className="mt-2 text-sm leading-relaxed text-ink-400">{children}</div> : null}
    </div>
  );
}
