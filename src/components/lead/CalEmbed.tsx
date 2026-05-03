// Cal.com embed. Using the public booking URL as an iframe — simplest
// path; CSP already permits cal.com frames in next.config.ts. Swap to
// the @calcom/embed-react component later if we want richer events.

import { env } from "@/lib/env";

export function CalEmbed({ slug = "30min" }: { slug?: string }) {
  const username = env.NEXT_PUBLIC_CAL_USERNAME;
  const url = `https://cal.com/${username}/${slug}?theme=dark&hideBranding=false`;
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <iframe
        src={url}
        title={`Book a call with ${username} on Cal.com`}
        className="h-[720px] w-full border-0"
        loading="lazy"
        // Cal.com renders inside this frame; we don't allow it to escape.
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
