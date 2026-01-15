/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Root layout with auth provider
 */

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { DM_Sans } from "next/font/google";

const dmSansFont = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Tabbit Functional Demo",
  description: "Tabbit Functional Demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased ${dmSansFont.className}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
