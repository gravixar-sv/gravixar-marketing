import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="font-mono text-sm uppercase tracking-widest text-brand">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        That page doesn&apos;t exist.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-zinc-400">
        Maybe it moved, maybe it never existed. Either way, back to the homepage.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-black hover:bg-brand-soft"
      >
        Go home
      </Link>
    </div>
  );
}
