import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Cleet Code: LeetCode for prompting";
const description = "Vague tickets, hidden requirements. Ask questions, then prompt your way to a fix.";

// Vercel injects VERCEL_PROJECT_PRODUCTION_URL in every environment (production,
// preview, and development alike), so it must be skipped on non-production
// environments or it always shadows the branch/deployment URL below. Needed so the
// OG/Twitter image files resolve to an absolute URL instead of Next silently
// defaulting to http://localhost:3000. Each candidate is tried in turn, and only
// accepted if it parses to an http(s) URL, so a malformed or non-http env var can't
// take down every route at import time.
function resolveSiteUrl(): URL {
  const isProduction = process.env.VERCEL_ENV === "production";
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    isProduction &&
      process.env.VERCEL_PROJECT_PRODUCTION_URL &&
      `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
    process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    !isProduction &&
      process.env.VERCEL_PROJECT_PRODUCTION_URL &&
      `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" || url.protocol === "https:") return url;
    } catch {
      // malformed, fall through to the next candidate
    }
  }
  return new URL("http://localhost:3000");
}

const SITE_URL = resolveSiteUrl();

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "Cleet Code",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
