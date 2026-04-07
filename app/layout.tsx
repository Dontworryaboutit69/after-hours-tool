import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Is Your Business Losing Calls? | Free Phone Coverage Check",
  description: "We call your business 5 times over 24 hours and show you exactly where you're losing customers. Free report with revenue impact analysis.",
  openGraph: {
    title: "Is Your Business Losing Calls?",
    description: "Free phone coverage report — we call your business and show you the gaps.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white font-[family-name:var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}
