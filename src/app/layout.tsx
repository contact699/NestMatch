import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "NestMatch - Find Your Perfect Roommate in Canada",
    template: "%s - NestMatch",
  },
  description:
    "The only roommate platform where every user is verified, every listing is real, and compatibility is based on how you actually live.",
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
      "The only roommate platform where every user is verified, every listing is real, and compatibility is based on how you actually live.",
    url: "https://nestmatch.ca",
    siteName: "NestMatch",
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NestMatch - Find Your Perfect Roommate in Canada",
    description:
      "The only roommate platform where every user is verified, every listing is real, and compatibility is based on how you actually live.",
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
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
