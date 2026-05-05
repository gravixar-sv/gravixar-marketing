import type { Metadata } from "next";

// /admin lives outside the (marketing) route group so it has a
// minimal chrome: no DemoBanner, no Navbar, no Footer. Just the
// dashboard content. Also marked noindex so search engines don't
// surface this page or treat it as canonical.

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-12 md:px-10 md:py-16">
      {children}
    </div>
  );
}
