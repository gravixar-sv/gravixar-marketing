// Dynamic OG image generator. Returns a 1200x630 PNG branded for gravixar.
// Used by buildMetadata() in lib/seo.ts whenever a page doesn't supply a
// static cover image.
//
// Ember Gate (2026-09-23): warm ink ground, the ember horizon light from the
// site's hero, the real wordmark instead of the word typed in system-ui, and
// the positioning line the site now leads with. The link card is the most
// shared surface the site has, so it should look like the site.

import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") ?? "Gravixar").slice(0, 140);
  const kind = (searchParams.get("kind") ?? "").slice(0, 40);

  // The wordmark is served from /public, so fetch it from this deployment's own
  // origin. If that fails the card still renders, with the name as text.
  let wordmark: string | null = null;
  try {
    const res = await fetch(new URL("/logos/gravixar-wordmark.png", req.url));
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      wordmark = `data:image/png;base64,${buf.toString("base64")}`;
    }
  } catch {
    wordmark = null;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#0c0a09",
          backgroundImage:
            "radial-gradient(60% 70% at 78% -10%, rgba(255,107,53,0.26), rgba(255,107,53,0) 70%), radial-gradient(30% 35% at 78% -4%, rgba(255,196,160,0.12), rgba(255,196,160,0) 70%)",
          color: "#f3efe8",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {wordmark ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wordmark} alt="Gravixar" height={40} style={{ height: 40 }} />
          ) : (
            <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: -1 }}>gravixar</span>
          )}
          {kind ? (
            <div
              style={{
                fontSize: 18,
                color: "#cdc6bc",
                border: "1px solid rgba(243,239,232,0.18)",
                padding: "8px 18px",
                borderRadius: 999,
                textTransform: "capitalize",
              }}
            >
              {kind}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: title.length > 60 ? 58 : 76,
              fontWeight: 600,
              lineHeight: 1.02,
              letterSpacing: -2,
              maxWidth: "94%",
              color: "#f7f4ee",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 32,
              display: "flex",
              alignItems: "center",
              gap: 16,
              color: "#948d85",
              fontSize: 22,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 999, background: "#ff6b35" }} />
            <span>The AI-ops platform that asks before it acts</span>
            <span style={{ color: "#4a4540" }}>·</span>
            <span>gravixar.com</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
