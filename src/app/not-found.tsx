import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="font-mono text-eyebrow uppercase text-brand">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
        That page doesn&apos;t exist.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-zinc-400">
        Maybe it moved, maybe it never existed. Either way, back to the homepage.
      </p>
      <Link
        href="/"
        className={cn("mt-8", buttonClass())}
      >
        Go home
      </Link>
    </div>
  );
}
