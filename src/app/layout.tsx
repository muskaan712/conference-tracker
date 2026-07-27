import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { THEME_INIT_SCRIPT } from "@/components/theme-toggle";
import { siteConfig } from "@/lib/site-config";
import { getSiteUrl } from "@/lib/site-url";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteConfig.title,
    template: `%s · ${siteConfig.title}`,
  },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    type: "website",
    siteName: siteConfig.title,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <a
          href="#main-content"
          className="focus:bg-accent focus:text-accent-foreground sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
