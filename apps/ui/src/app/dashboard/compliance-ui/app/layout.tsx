import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "../components/providers";
import AppShell from "../components/AppShell";

export const metadata: Metadata = {
  title: 'CrossBorder Compliance Console | Nexus Core AI',
  description: 'Automate cross-border trade compliance, OCR invoice extraction, HS tariff classification, and AfCFTA rules parsing with Nexus Core.',
  keywords: [
    'CrossBorder Compliance',
    'AfCFTA Rulesets',
    'HS Tariff Classification',
    'Automated Customs Clearance',
    'Cargo Invoice OCR Parsing',
    'Trade Compliance AI',
    'Nexus Core',
  ],
  openGraph: {
    title: 'CrossBorder Compliance Console | Nexus Core AI',
    description: 'Automate trade document processing, HS code classification, and AfCFTA compliance in real time.',
    url: 'https://nexusthecore.com/compliance',
    siteName: 'Nexus Core',
    images: [{ url: 'https://nexusthecore.com/og-compliance-console.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CrossBorder Compliance Console | Nexus Core AI',
    description: 'Automate trade document processing, HS code classification, and AfCFTA compliance in real time.',
    images: ['https://nexusthecore.com/og-compliance-console.png'],
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark antialiased scroll-smooth">
      <body className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
