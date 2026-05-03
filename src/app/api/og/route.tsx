// Dynamic OG image generator. Returns a 1200x630 PNG branded for gravixar.
// Used by buildMetadata() in lib/seo.ts whenever a page doesn't supply a
// static cover image.

import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") ?? "Gravixar").slice(0, 140);
  const kind = (searchParams.get("kind") ?? "").slice(0, 40);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #0a0a0a 60%, #1a1305 100%)",
          color: "#fafafa",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: -1 }}>
              gravixar
            </span>
            <span
              style={{
                fontSize: 12,
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                color: "#ff6b35",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              ai-augmented ops
            </span>
          </div>
          {kind ? (
            <div
              style={{
                fontSize: 12,
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                color: "#ff6b35",
                letterSpacing: 2,
                textTransform: "uppercase",
                border: "1px solid #ff6b35",
                padding: "6px 14px",
                borderRadius: 4,
              }}
            >
              {kind}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              fontSize: title.length > 60 ? 56 : 72,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              maxWidth: "92%",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              gap: 16,
              color: "#71717a",
              fontSize: 18,
            }}
          >
            <div style={{ width: 32, height: 2, background: "#ff6b35" }} />
            <span>gravixar.com</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
