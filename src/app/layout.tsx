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
