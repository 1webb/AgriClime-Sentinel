import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgriClime Sentinel - Climate Risk Dashboard for U.S. Agriculture",
  description:
    "Real-time climate risk monitoring platform for U.S. agricultural security. Track drought, soil moisture, temperature anomalies, and crop yield risks across all U.S. counties.",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
        {/* Suppress known Recharts + React 19 type warnings */}
        <Script id="suppress-recharts-warnings" strategy="beforeInteractive">
          {`
            if (typeof window !== 'undefined') {
              const originalError = console.error;
              console.error = (...args) => {
                // Suppress known Recharts type warnings that don't affect functionality
                if (
                  typeof args[0] === 'string' &&
                  (args[0].includes('popupClassName') ||
                   args[0].includes('TooltipProps') ||
                   args[0].includes('not assignable to type'))
                ) {
                  return;
                }
                originalError.apply(console, args);
              };
            }
          `}
        </Script>
      </body>
    </html>
  );
}
