import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import config from "./config";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ZaloWidget from "@/components/ZaloWidget";

// Import các thành phần mới thêm vào
import ChatbotWidget from "@/components/ChatbotWidget";
import { UserProvider } from "@/components/UserProvider";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});
const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
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
        <UserProvider>
          {children}
          <Analytics />
          <SpeedInsights />
          
          {/* Các widget hiển thị toàn cục */}
          <ZaloWidget />
          <ChatbotWidget />
        </UserProvider>
      </body>
    </html>
  );
}
