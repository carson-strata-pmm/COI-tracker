import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CertTrack — COI Compliance Tracking",
  description:
    "Track certificates of insurance from your vendors. Automated expiration tracking, upload requests, and AI gap analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
