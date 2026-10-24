import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MARQUE, SLOGAN } from "@/lib/config";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: `${MARQUE} — Transport de marchandises à La Réunion`,
  description: SLOGAN,
};

// viewportFit « cover » : dans l'app iPhone, la page passe sous la barre d'état ;
// les marges « safe-area » ci-dessous gardent le contenu hors de l'encoche et de la barre.
export const viewport: Viewport = { themeColor: "#121212", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={archivo.variable}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <header className="bg-noir pt-[env(safe-area-inset-top)] text-blanc">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 py-4 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6">
            <Link href="/" aria-label={`${MARQUE}, accueil`}>
              <Logo />
            </Link>
            <div className="flex items-center gap-6 text-petit font-bold">
              <Link href="/#pro" className="hidden hover:text-jaune md:inline">
                Magasins et entreprises
              </Link>
              <Link href="/transporteur" className="hidden hover:text-jaune md:inline">
                Devenir transporteur
              </Link>
              <Link href="/transporteur" className="rounded-bouton border border-blanc/70 px-4 py-2.5 hover:border-jaune hover:text-jaune">
                Me connecter
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mx-auto w-full max-w-6xl px-4 pt-8 pb-28 text-petit text-gris-500 sm:px-6 lg:pb-8">
          <div className="flex flex-col gap-2 border-t border-gris-300 pt-6 sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} {MARQUE} · La Réunion · Transporteurs inscrits au registre des transporteurs</p>
            <p className="flex gap-4">
              <span>CGV</span>
              <span>Mentions légales</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
