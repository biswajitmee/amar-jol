import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bottle Hero Screen",
  description: "R3F, Theatre.js, Next.js, and Tailwind camera setup",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
