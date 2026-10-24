"use client";

import { useOptimistic, useTransition } from "react";
import { basculerEnLigne } from "@/app/actions/transporteur";

// Interrupteur coulissant : le pouce glisse à droite (jaune) en ligne, à gauche (gris) hors ligne.
export function InterrupteurEnLigne({ enLigne }: { enLigne: boolean }) {
  const [, demarrer] = useTransition();
  const [actif, setActif] = useOptimistic(enLigne);

  const basculer = () =>
    demarrer(async () => {
      setActif(!actif);
      const form = new FormData();
      form.set("en_ligne", actif ? "0" : "1");
      await basculerEnLigne(form);
    });

  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label="En ligne"
      onClick={basculer}
      className="flex items-center gap-3 font-extrabold"
    >
      <span className={`w-[5.5rem] text-right text-petit ${actif ? "text-jaune" : "text-gris-300"}`}>{actif ? "En ligne" : "Hors ligne"}</span>
      <span className={`relative h-8 w-14 shrink-0 rounded-pastille transition-colors ${actif ? "bg-jaune" : "bg-noir-700"}`}>
        <span
          className={`absolute top-1 left-1 size-6 rounded-pastille shadow transition-transform duration-200 ${actif ? "translate-x-6 bg-noir" : "bg-gris-300"}`}
        />
      </span>
    </button>
  );
}
