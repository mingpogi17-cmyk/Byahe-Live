import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Sans carries UI copy. Mono carries every number a commuter needs to
// read at a glance in daylight — seats left, minutes, route codes —
// mimicking an LED terminal departure board.
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-app-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-app-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Biyahe Live — Davao Region van & bus tracker",
  description:
    "Crowdsourced live tracking for provincial vans and buses across Davao Region — Digos, Tagum, Mati, Malita, Nabunturan.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Biyahe Live",
  },
};

export const viewport: Viewport = {
  themeColor: "#1F5D3A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
