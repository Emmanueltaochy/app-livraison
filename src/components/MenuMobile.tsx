"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MENU } from "@/lib/navigation";

// Menu « hamburger » du site sur téléphone : panneau plein écran sous l'en-tête.
export function MenuMobile({ compte }: { compte: { href: string; libelle: string } }) {
  const [ouvert, setOuvert] = useState(false);
  const chemin = usePathname();
  useEffect(() => setOuvert(false), [chemin]);
  useEffect(() => {
    document.body.style.overflow = ouvert ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [ouvert]);

  return (
    <>
      <button type="button" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"} className="flex size-11 items-center justify-center rounded-bouton lg:hidden">
        {ouvert ? <X className="size-7" /> : <Menu className="size-7" />}
      </button>
      {ouvert && (
        <nav aria-label="Menu" className="fixed inset-x-0 top-[calc(4.5rem+env(safe-area-inset-top))] bottom-0 z-40 overflow-y-auto bg-noir px-4 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:hidden">
          <ul className="divide-y divide-noir-700">
            {MENU.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={`block py-4 text-h4 font-extrabold ${chemin === l.href ? "text-jaune" : ""}`}>
                  {l.libelle}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/contact" className="block py-4 text-h4 font-extrabold">Contact</Link>
            </li>
          </ul>
          <div className="mt-6 grid gap-3">
            <Link href="/#reserver" className="bouton h-14 text-h4">Réserver un transport</Link>
            <Link href={compte.href} className="flex h-14 items-center justify-center rounded-bouton border-2 border-blanc font-extrabold">
              {compte.libelle}
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
