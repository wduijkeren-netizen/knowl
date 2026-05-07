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
  title: "Knowl — Jouw leertracker",
  description: "Houd bij wat je leert, wanneer je leert en hoe je groeit.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: "https://knowl.app",
    siteName: "Knowl",
    title: "Knowl — Jouw leertracker",
    description: "Houd bij wat je leert, wanneer je leert en hoe je groeit.",
    images: [
      {
        url: "/og-image.png",
        width: 800,
        height: 800,
        alt: "Knowl — Jouw persoonlijke leertracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Knowl — Jouw leertracker",
    description: "Houd bij wat je leert, wanneer je leert en hoe je groeit.",
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
