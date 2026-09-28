import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "../components/providers";
import AppShell from "../components/AppShell";

export const metadata: Metadata = {
  title: {
    default: "Nexus Core — Cross-Border Compliance AI",
    template: "%s | Nexus Core",
  },
  description: "Autonomous AI Agents for Cross-Border Trade & Customs Compliance.",
  icons: {
    icon: "/favicon.ico",
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
