"use client";

import { useActionState } from "react";
import { mettreAJourProfil } from "@/app/actions/compte";

export function FormulaireProfil({ nom, telephone }: { nom: string; telephone: string }) {
  const [etat, action, enCours] = useActionState(mettreAJourProfil, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="etiquette" htmlFor="nom">Nom ou société</label>
        <input id="nom" name="nom" className="champ" required autoComplete="name" defaultValue={nom} />
      </div>
      <div>
        <label className="etiquette" htmlFor="telephone">Téléphone</label>
        <input id="telephone" name="telephone" type="tel" className="champ" required autoComplete="tel" defaultValue={telephone} />
      </div>
      {etat.erreur && <p className="rounded-bouton bg-erreur-clair p-3 text-petit font-bold text-erreur sm:col-span-2">{etat.erreur}</p>}
      {etat.ok && <p className="rounded-bouton bg-succes-clair p-3 text-petit font-bold text-succes sm:col-span-2">{etat.ok}</p>}
      <button className="bouton sm:col-span-2" disabled={enCours}>{enCours ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}
