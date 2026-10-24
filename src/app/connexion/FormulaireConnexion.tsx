"use client";

import { MailCheck } from "lucide-react";
import { useActionState } from "react";
import { envoyerLien } from "./actions";

export function FormulaireConnexion({ retour }: { retour: string }) {
  const [etat, action, enCours] = useActionState(envoyerLien, {});
  if (etat.ok)
    return (
      <div className="flex gap-3 rounded-bouton bg-succes-clair p-4 text-succes">
        <MailCheck className="size-6 shrink-0" />
        <p className="font-bold">{etat.ok}</p>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="retour" value={retour} />
      <div>
        <label className="etiquette" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required className="champ" autoComplete="email" />
      </div>
      {etat.erreur && <p className="text-petit font-bold text-erreur">{etat.erreur}</p>}
      <button className="bouton w-full" disabled={enCours}>{enCours ? "Envoi…" : "Recevoir mon lien"}</button>
    </form>
  );
}
