import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import Header from "@/components/header";
import Footer from "@/components/footer";
import StoreProvider, { RevealRoot } from "@/components/store-provider";
import { business } from "@/lib/business";
import "./globals.css";
import "./storefront-refresh.css";

const bodyFont = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const headingFont = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-heading", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Moon Store - Tech, Motor Care & Signature Treats", template: "%s | Moon Store" },
  description: "Kingston USB storage, Motul motorcycle oils and homemade crunchy snacks. Locally dispatched from Besut, Terengganu. Order with Moon Store on WhatsApp.",
  keywords: ["Moon Store", "Besut", "Kampong Raja", "Jerteh", "Terengganu", "Kingston USB", "Motul 5100", "Popia Nestum", "Honey Cornflakes"],
  authors: [{ name: "Moon Store" }],
  creator: "Moon Store",
  publisher: "Moon Store",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_MY",
    siteName: "Moon Store",
    title: "Moon Store - Tech, Motor Care & Signature Treats",
    description: "Kingston USB storage, Motul motorcycle oils and homemade crunchy snacks. Locally dispatched from Besut, Terengganu.",
    images: [{ url: "/products/usb-3.2.jpg", alt: "Kingston DataTraveler Exodia G2 at Moon Store" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Moon Store - Tech, Motor Care & Signature Treats",
    description: "Curated quality essentials dispatched locally from Besut, Terengganu. Order on WhatsApp.",
    images: ["/products/usb-3.2.jpg"],
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
  sameAs: [business.facebook, business.instagram, business.whatsapp, business.maps],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-MY" suppressHydrationWarning className={`${bodyFont.variable} ${headingFont.variable}`}><head><script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('moonstore-theme');var s=t==='light'||t==='dark';document.documentElement.dataset.theme=s?t:'dark';if(s)document.documentElement.dataset.themeOverride='true';}catch(e){document.documentElement.dataset.theme='dark';}})();` }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }} /></head><body><StoreProvider><RevealRoot><a href="#main" className="skip-link">Skip to content</a><Header /><main id="main">{children}</main><Footer /></RevealRoot></StoreProvider></body></html>;
}
