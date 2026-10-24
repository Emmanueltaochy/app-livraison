"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  { href: "/compte", libelle: "Mes courses" },
  { href: "/compte/cartes", libelle: "Mes cartes" },
  { href: "/compte/profil", libelle: "Mon profil" },
];

export function OngletsCompte() {
  const chemin = usePathname();
  return (
    <nav aria-label="Mon compte" className="-mb-px flex gap-1 overflow-x-auto">
      {ONGLETS.map((o) => {
        const actif = chemin === o.href;
        return (
          <Link
            key={o.href}
            href={o.href}
            aria-current={actif ? "page" : undefined}
            className={`shrink-0 rounded-t-bouton px-4 py-3 font-extrabold ${actif ? "bg-fond text-noir" : "text-gris-300 hover:text-blanc"}`}
          >
            {o.libelle}
          </Link>
        );
      })}
    </nav>
  );
}
