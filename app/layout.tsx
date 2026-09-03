import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Inter, Playfair_Display } from "next/font/google";
import config from "./config";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ZaloWidget from "@/components/ZaloWidget";

const ChatbotWidget = dynamic(() => import("@/components/ChatbotWidget"));

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: config.siteName,
  description: config.siteName,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased relative`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
        
        {/* Các widget hiển thị toàn cục */}
        <ZaloWidget />
        <ChatbotWidget />
      </body>
    </html>
  );
}
