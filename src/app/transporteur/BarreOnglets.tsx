"use client";

import { History, ListChecks, Truck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  { href: "/transporteur", libelle: "Courses", icone: ListChecks },
  { href: "/transporteur/en-cours", libelle: "En cours", icone: Truck },
  { href: "/transporteur/historique", libelle: "Historique", icone: History },
  { href: "/transporteur/compte", libelle: "Compte", icone: UserRound },
];

// Barre d'onglets fixée en bas, comme une app native ; marge « safe-area » pour la barre d'accueil de l'iPhone.
export function BarreOnglets({ enCours }: { enCours: number }) {
  const chemin = usePathname();
  return (
    <nav
      aria-label="Navigation transporteur"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-noir-700 bg-noir pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {ONGLETS.map(({ href, libelle, icone: Icone }) => {
          const actif = chemin === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={actif ? "page" : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[0.75rem] font-bold ${actif ? "text-jaune" : "text-gris-300 hover:text-blanc"}`}
              >
                <Icone className="size-6" strokeWidth={actif ? 2.5 : 2} />
                {libelle}
                {href.endsWith("en-cours") && enCours > 0 && (
                  <span className="absolute top-2 left-1/2 ml-2 flex size-5 items-center justify-center rounded-pastille bg-jaune text-[0.7rem] font-extrabold text-noir">
                    {enCours}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
