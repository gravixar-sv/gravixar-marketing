export function PageHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
}) {
  return (
    <header className="border-b border-zinc-900 pb-10">
      {eyebrow ? (
        <p className="font-mono text-xs uppercase tracking-widest text-brand">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
        {title}
      </h1>
      {lede ? (
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-400">
          {lede}
        </p>
      ) : null}
    </header>
  );
}
