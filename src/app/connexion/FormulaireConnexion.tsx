"use client";

import { useActionState } from "react";
import { envoyerLien } from "./actions";

export function FormulaireConnexion({ retour }: { retour: string }) {
  const [etat, action, enCours] = useActionState(envoyerLien, {});
  if (etat.ok) return <p className="rounded-lg bg-green-50 p-3 text-green-800">{etat.ok}</p>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="retour" value={retour} />
      <label className="etiquette" htmlFor="email">E-mail</label>
      <input id="email" name="email" type="email" required className="champ" autoComplete="email" />
      {etat.erreur && <p className="text-sm text-red-700">{etat.erreur}</p>}
      <button className="bouton w-full" disabled={enCours}>{enCours ? "Envoi…" : "Recevoir mon lien"}</button>
    </form>
  );
}
