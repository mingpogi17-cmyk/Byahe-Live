import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { PwaTracker } from "@/components/PwaTracker"; // Gagawa tayo nito sa Step 2

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🚨 ITO ANG PARA SA FACEBOOK/MESSENGER PREVIEW
export const metadata: Metadata = {
  title: "Biyahe Live | Davao Commuter Telemetry",
  description: "Alam mo na bago ka pa umabang. Real-time tracking ng mga Van at Bus sa Davao Region.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Biyahe Live",
    description: "Alam mo na bago ka pa umabang. Track buses and vans in Davao in real-time.",
    url: "https://byahe-live.vercel.app",
    siteName: "Biyahe Live",
    images: [
      {
        url: "https://byahe-live.vercel.app/og-image.png", // Dapat may image ka sa public folder
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f1c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Analytics /> 
        <PwaTracker />
      </body>
    </html>
  );
}