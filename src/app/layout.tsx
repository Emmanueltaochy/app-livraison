import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { MARQUE, SLOGAN } from "@/lib/config";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${MARQUE} — Transport de marchandises à La Réunion`,
  description: SLOGAN,
};

export const viewport: Viewport = { themeColor: "#0f766e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${geist.variable} font-sans antialiased`}>
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="text-xl font-bold text-marque">
              {MARQUE}
            </Link>
            <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
              <Link href="/#reserver" className="hover:text-marque">
                Réserver
              </Link>
              <Link href="/transporteur" className="hover:text-marque">
                Espace transporteur
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 pt-6 pb-24 lg:pb-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-slate-500">
          {MARQUE} — mise en relation avec des transporteurs professionnels inscrits au registre des transporteurs.
        </footer>
      </body>
    </html>
  );
}
