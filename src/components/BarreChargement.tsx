"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Fine barre jaune en haut de l'écran pendant le chargement d'une page (comme YouTube ou GitHub) :
// le clic est confirmé tout de suite, même si le serveur met un instant à répondre.
export function BarreChargement() {
  const chemin = usePathname();
  const recherche = useSearchParams();
  const [progression, setProgression] = useState<number | null>(null);
  const minuteur = useRef<ReturnType<typeof setInterval>>(undefined);
  const secours = useRef<ReturnType<typeof setTimeout>>(undefined);

  const terminer = () => {
    clearInterval(minuteur.current);
    clearTimeout(secours.current);
    setProgression((p) => (p === null ? null : 100));
    setTimeout(() => setProgression((p) => (p === 100 ? null : p)), 300);
  };

  useEffect(() => {
    const auClic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const lien = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!lien || (lien.target && lien.target !== "_self") || lien.hasAttribute("download")) return;
      const url = new URL(lien.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // même page ou ancre
      clearInterval(minuteur.current);
      clearTimeout(secours.current);
      setProgression(8);
      // Avance vite au début puis ralentit sans jamais atteindre 100 % avant la fin réelle.
      minuteur.current = setInterval(() => setProgression((p) => (p === null || p >= 100 ? p : p + (90 - p) * 0.08)), 120);
      secours.current = setTimeout(terminer, 12_000);
    };
    document.addEventListener("click", auClic, true);
    return () => document.removeEventListener("click", auClic, true);
  }, []);

  // La nouvelle page est affichée : on termine la barre.
  useEffect(terminer, [chemin, recherche]);

  if (progression === null) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-[100] h-[3px]" role="progressbar" aria-label="Chargement" aria-valuenow={Math.round(progression)}>
      <div
        className="h-full bg-jaune shadow-[0_0_8px_var(--color-jaune)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progression}%`, opacity: progression >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
