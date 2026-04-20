import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-arabic"
});

export const metadata: Metadata = {
  title: "Wedding Invitation",
  description: "Wedding invitation website with guest RSVP support."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={notoSansArabic.variable}>{children}</body>
    </html>
  );
}
