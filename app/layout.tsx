import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const SITE_NAME = "RevSquared AI";

export const metadata: Metadata = {
  title: {
    default: "Free Phone Coverage Check for Local Businesses | RevSquared AI",
    template: "%s | RevSquared AI",
  },
  description:
    "Find out if your business is losing customers to missed calls. We call your business 5 times over 24 hours and send you a free report with your coverage score, revenue impact, and what your Google reviews say about your phone service.",
  keywords: [
    "phone coverage check",
    "missed calls business",
    "after hours phone service",
    "business phone audit",
    "missed call revenue calculator",
    "answering service test",
    "small business phone coverage",
    "AI phone agent",
    "voicemail lost customers",
    "phone coverage report",
  ],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://after-hours-tool.vercel.app"
  ),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Is Your Business Losing Calls? Free Phone Coverage Check",
    description:
      "We call your business 5 times over 24 hours and send you a free report showing exactly where you're losing customers — and how much it's costing you.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Is Your Business Losing Calls? Free Phone Coverage Check",
    description:
      "We call your business 5 times over 24 hours and send you a free report showing exactly where you're losing customers.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const toolSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Free Phone Coverage Check",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Free tool that calls your business 5 times over 24 hours and generates a phone coverage report with grade, revenue impact, and Google review analysis.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    provider: {
      "@type": "Organization",
      name: "RevSquared AI",
      url: "https://revsquared.ai",
    },
  };

  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(toolSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-primary">
        {children}
      </body>
    </html>
  );
}
