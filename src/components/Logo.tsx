import { MARQUE } from "@/lib/config";

// Symbole « Le Lacet » : une route de l'île qui serpente jusqu'à la livraison.
export function Symbole({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#FFC800" />
      <circle cx="10.5" cy="36" r="4.25" fill="#121212" />
      <path d="M18 36H29a6 6 0 0 0 0-12H19a6 6 0 0 1 0-12h12" fill="none" stroke="#121212" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29 6.5 34.5 12 29 17.5" fill="none" stroke="#121212" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Le mot-symbole : « Fret » prend la couleur du texte, « Péi » reste jaune (logo réservé aux fonds sombres).
export function Logo({ clair = true }: { clair?: boolean }) {
  const fin = MARQUE.endsWith("Péi") ? "Péi" : "";
  return (
    <span className="inline-flex items-center gap-2.5">
      <Symbole />
      <span className={`large text-[1.6rem] font-extrabold tracking-tight ${clair ? "text-blanc" : "text-noir"}`}>
        {MARQUE.slice(0, MARQUE.length - fin.length)}
        {fin && <span className={clair ? "text-jaune" : "text-noir"}>{fin}</span>}
      </span>
    </span>
  );
}
