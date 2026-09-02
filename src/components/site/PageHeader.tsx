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
    <header className="border-b border-line-soft pb-10">
      {eyebrow ? (
        <p className="font-mono text-eyebrow uppercase text-brand">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-page">
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
