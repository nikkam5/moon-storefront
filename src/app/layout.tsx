import type { Metadata, Viewport } from "next";
import Header from "@/components/header";
import Footer from "@/components/footer";
import StoreProvider, { RevealRoot } from "@/components/store-provider";
import { business } from "@/lib/business";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Moon Store — Tech, Motor Care & Signature Treats", template: "%s | Moon Store" },
  description: "Kingston USB storage, Motul motorcycle oils and homemade crunchy snacks. Locally dispatched from Besut, Terengganu. Order with Moon Store on WhatsApp.",
  keywords: ["Moon Store", "Besut", "Kampong Raja", "Jerteh", "Terengganu", "Kingston USB", "Motul 7100", "Motul 5100", "Popia Nestum", "Honey Cornflakes"],
  authors: [{ name: "Moon Store" }],
  creator: "Moon Store",
  publisher: "Moon Store",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_MY",
    siteName: "Moon Store",
    title: "Moon Store — Tech, Motor Care & Signature Treats",
    description: "Kingston USB storage, Motul motorcycle oils and homemade crunchy snacks. Locally dispatched from Besut, Terengganu.",
    images: [{ url: "/products/usb.png", width: 1200, height: 630, alt: "Kingston DataTraveler Exodia G2 at Moon Store" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Moon Store — Tech, Motor Care & Signature Treats",
    description: "Curated quality essentials dispatched locally from Besut, Terengganu. Order on WhatsApp.",
    images: ["/products/usb.png"],
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#faf7f0" }, { media: "(prefers-color-scheme: dark)", color: "#0c1729" }],
};

const storeJsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: business.name,
  description: "Tech essentials, performance engine oils and signature treats, dispatched locally from Besut, Terengganu.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Jalan Taman Kepas Indah, Taman Kepas Indah, Kampong Raja",
    addressLocality: "Jerteh",
    addressRegion: "Terengganu",
    postalCode: "22000",
    addressCountry: "MY",
  },
  telephone: "+601161647061",
  email: business.email,
  openingHoursSpecification: { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "00:00", closes: "23:59" },
  sameAs: [business.whatsapp, business.maps],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-MY" suppressHydrationWarning><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('moonstore-theme');var s=t==='light'||t==='dark';document.documentElement.dataset.theme=s?t:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(s)document.documentElement.dataset.themeOverride='true';}catch(e){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}})();` }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }} /></head><body><StoreProvider><RevealRoot><a href="#main" className="skip-link">Skip to content</a><Header /><main id="main">{children}</main><Footer /></RevealRoot></StoreProvider></body></html>;
}
