import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LIFE OS 365",
  description: "Personal operating system with cloud sync",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
