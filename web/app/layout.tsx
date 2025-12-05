import type { Metadata } from "next";
import "./globals.css";

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
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
