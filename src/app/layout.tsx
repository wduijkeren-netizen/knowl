import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { GuestProvider } from "@/lib/GuestContext";
import { ThemeProvider } from "@/lib/ThemeContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Knowl — Jouw leertracker",
  description: "Houd bij wat je leert, wanneer je leert en hoe je groeit.",
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: "https://knowl.app",
    siteName: "Knowl",
    title: "Knowl — Jouw leertracker",
    description: "Houd bij wat je leert, wanneer je leert en hoe je groeit.",
    images: [
      {
        url: "https://knowl.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Knowl — Jouw persoonlijke leertracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Knowl — Jouw leertracker",
    description: "Houd bij wat je leert, wanneer je leert en hoe je groeit.",
    images: ["https://knowl.app/og-image.png"],
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
            </GuestProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
