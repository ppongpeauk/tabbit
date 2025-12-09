/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Root layout with auth provider
 */

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";

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
      <body className={`antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
