import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { MARQUE, SLOGAN } from "@/lib/config";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: `${MARQUE} — Transport de marchandises à La Réunion`,
  description: SLOGAN,
};

// viewportFit « cover » : dans l'app iPhone, la page passe sous la barre d'état ;
// chaque en-tête ajoute la marge « safe-area » pour rester hors de l'encoche et de la barre.
export const viewport: Viewport = { themeColor: "#121212", width: "device-width", initialScale: 1, viewportFit: "cover" };

// Deux mises en page distinctes : (site) pour les clients, transporteur/ pour l'app chauffeur.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={archivo.variable}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">{children}</body>
    </html>
  );
}
