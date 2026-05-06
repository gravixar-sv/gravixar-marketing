import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { DemoBanner } from "@/components/site/DemoBanner";

// Marketing chrome wrapper. Applied to every page in the (marketing)
// route group: DemoBanner top, Navbar, content max-w-6xl, Footer.
// /admin and other non-marketing routes don't get this layer.

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DemoBanner />
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12 md:pt-16">{children}</main>
      <Footer />
    </>
  );
}
