import type { Metadata } from "next";
import { Inter, Manrope, Geist } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@/components/google-analytics";
import { PostHogPageview } from "@/components/posthog-provider";
import { CookieConsent } from "@/components/cookie-consent";
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
  title: {
    default: "NestMatch - Find Your Perfect Roommate in Canada",
    template: "%s - NestMatch",
  },
  description:
    "Find your perfect roommate in Canada — lifestyle-based matching, real listings, and optional ID verification for added trust.",
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
  openGraph: {
    title: "NestMatch - Find Your Perfect Roommate in Canada",
    description:
      "Find your perfect roommate in Canada — lifestyle-based matching, real listings, and optional ID verification for added trust.",
    url: "https://www.nestmatch.app",
    siteName: "NestMatch",
    locale: "en_CA",
    type: "website",
    images: [
      {
        url: "https://www.nestmatch.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "NestMatch - Find Your Perfect Roommate in Canada",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NestMatch - Find Your Perfect Roommate in Canada",
    description:
      "Find your perfect roommate in Canada — lifestyle-based matching, real listings, and optional ID verification for added trust.",
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
        <Toaster position="bottom-right" richColors closeButton />
        <CookieConsent />
      </body>
    </html>
  );
}
