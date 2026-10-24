"use client";

import { Delete, RotateCcw } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { confirmerLivraison } from "@/app/actions/transporteur";

const TOUCHES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Saisie du code client : 4 cases + pavé numérique géant (utilisable d'une main, au soleil).
export function FormulaireLivraison({ id, commune }: { id: string; commune: string }) {
  const [etat, action, enCours] = useActionState(confirmerLivraison, {});
  const [code, setCode] = useState("");
  const [erreurVisible, setErreurVisible] = useState(false);
  const ajouter = (chiffre: string) => {
    setErreurVisible(false);
    setCode((c) => (c.length < 4 ? c + chiffre : c));
  };

  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) ajouter(e.key);
      if (e.key === "Backspace") setCode((c) => c.slice(0, -1));
    };
    window.addEventListener("keydown", clavier);
    return () => window.removeEventListener("keydown", clavier);
  }, []);

  useEffect(() => {
    if (etat.erreur) {
      setCode("");
      setErreurVisible(true);
    }
  }, [etat]);

  const touche = "flex h-16 items-center justify-center rounded-carte bg-noir-700 text-h2 font-bold active:bg-gris-700";

  return (
    <form action={action} className="space-y-5 rounded-carte bg-noir-800 p-5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="code" value={code} />
      <div>
        <p className="text-gris-300">Étape 2 : livraison · {commune}</p>
        <h3 className="titre text-h2">Code de livraison</h3>
        <p className="text-gris-300">Demandez le code à 4 chiffres au client.</p>
      </div>
      <div className="grid grid-cols-4 gap-3" aria-live="polite" aria-label={`Code saisi : ${code.length} chiffres sur 4`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`chiffres flex aspect-square items-center justify-center rounded-carte border-2 text-code font-extrabold ${
              code[i] ? "border-jaune bg-jaune text-noir" : i === code.length ? "border-jaune" : "border-noir-700"
            }`}
          >
            {code[i] ?? ""}
          </span>
        ))}
      </div>
      {erreurVisible && etat.erreur && <p className="rounded-bouton bg-erreur-clair p-3 font-bold text-erreur" role="alert">{etat.erreur}</p>}
      <div className="grid grid-cols-3 gap-3">
        {TOUCHES.map((t) => (
          <button key={t} type="button" className={touche} onClick={() => ajouter(t)}>{t}</button>
        ))}
        <button type="button" className={touche} onClick={() => setCode((c) => c.slice(0, -1))} aria-label="Effacer le dernier chiffre">
          <Delete className="size-7" />
        </button>
        <button type="button" className={touche} onClick={() => ajouter("0")}>0</button>
        <button type="button" className={touche} onClick={() => setCode("")} aria-label="Tout effacer">
          <RotateCcw className="size-7" />
        </button>
      </div>
      <button className="bouton h-16 w-full rounded-carte text-h4" disabled={code.length !== 4 || enCours}>
        {enCours ? "Vérification…" : "Confirmer la livraison"}
      </button>
    </form>
  );
}
