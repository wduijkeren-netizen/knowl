import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { GuestProvider } from "@/lib/GuestContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import CookieBanner from "@/components/CookieBanner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: { default: 'Knowl — Gratis leertracker voor studenten', template: '%s | Knowl' },
  description: "Log leermomenten, stel doelen per vak en volg je voortgang. Gratis leertracker voor studenten — geen account nodig om te starten.",
  keywords: ['leertracker', 'studenten', 'leermomenten', 'studieplanner', 'knowl', 'myknowl', 'gratis', 'vakken bijhouden', 'studieapp'],
  authors: [{ name: 'Knowl' }],
  creator: 'Knowl',
  metadataBase: new URL('https://myknowl.com'),
  alternates: { canonical: 'https://myknowl.com' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: "https://myknowl.com",
    siteName: "Knowl",
    title: "Knowl — Leertracker voor studenten",
    description: "Log leermomenten, stel doelen per vak en volg je voortgang. Gratis leertracker voor studenten — geen account nodig om te starten.",
    images: [
      {
        url: "/og-image.png",
        width: 800,
        height: 800,
        alt: "Knowl — Leertracker voor studenten",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Knowl — Leertracker voor studenten",
    description: "Log leermomenten, stel doelen per vak en volg je voortgang. Gratis leertracker voor studenten.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>
          <LanguageProvider>
            <GuestProvider>
              {children}
              <CookieBanner />
            </GuestProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
