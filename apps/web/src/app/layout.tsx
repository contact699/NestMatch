import type { Metadata } from "next";
import { Inter, Manrope, Geist } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@/components/google-analytics";
import { PostHogPageview } from "@/components/posthog-provider";
import { CookieConsent } from "@/components/cookie-consent";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

const geist = Geist({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-geist",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  // Resolves relative URLs in `alternates`/`openGraph` across every route.
  // NOTE: `alternates.canonical` deliberately lives on `app/page.tsx` and not
  // here — Next.js inherits metadata into child segments, so a root canonical
  // would point every un-overriding page (/search, /login, …) at "/".
  metadataBase: new URL("https://www.nestmatch.app"),
  title: {
    default: "NestMatch - Find Your Perfect Roommate in Canada",
    template: "%s - NestMatch",
  },
  description:
    "Find your perfect roommate in Canada — lifestyle-based matching, verified profiles, and optional ID verification for added trust.",
  keywords: [
    "roommate",
    "Canada",
    "Toronto",
    "Vancouver",
    "Ottawa",
    "Montreal",
    "room rental",
    "shared housing",
    "verified roommates",
  ],
  authors: [{ name: "NestMatch" }],
  // NOTE: no explicit `images` on openGraph/twitter. The share cards come from
  // the file-based `app/opengraph-image.tsx` and `app/twitter-image.tsx`
  // routes, which Next.js injects automatically. An `images` array here would
  // override those — and the URL it used to name (/og-image.png) has never
  // existed in `public/`, so every share preview resolved to a 404.
  openGraph: {
    title: "NestMatch - Find Your Perfect Roommate in Canada",
    description:
      "Find your perfect roommate in Canada — lifestyle-based matching, verified profiles, and optional ID verification for added trust.",
    url: "https://www.nestmatch.app",
    siteName: "NestMatch",
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NestMatch - Find Your Perfect Roommate in Canada",
    description:
      "Find your perfect roommate in Canada — lifestyle-based matching, verified profiles, and optional ID verification for added trust.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${manrope.variable} ${geist.variable} font-sans antialiased`}>
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <PostHogPageview />
        </Suspense>
        {children}
        <Toaster position="bottom-right" richColors closeButton duration={5000} />
        <CookieConsent />
        <SpeedInsights />
      </body>
    </html>
  );
}
