import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { clerkConfigured } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadEngine — Novenworks",
  description:
    "Prospect discovery and qualification. Find local businesses worth Novenworks' time, and hand the good ones to AuditWorkspace.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // ClerkProvider is only mounted when Clerk is configured; importing it
  // unconditionally would crash the app in the documented dev-auth mode.
  if (clerkConfigured()) {
    const { ClerkProvider } = await import("@clerk/nextjs");
    return (
      <ClerkProvider>
        <html lang="en">
          <body>{children}</body>
        </html>
      </ClerkProvider>
    );
  }

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
