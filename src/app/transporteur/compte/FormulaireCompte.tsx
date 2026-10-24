"use client";

import { useActionState } from "react";
import { mettreAJourCompte } from "@/app/actions/transporteur";
import { VEHICULES } from "@/lib/pricing";

type Valeurs = { nom: string; telephone: string; vehicule: string; immatriculation: string };

export function FormulaireCompte({ valeurs }: { valeurs: Valeurs }) {
  const [etat, action, enCours] = useActionState(mettreAJourCompte, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="etiquette" htmlFor="nom">Nom et prénom</label>
        <input id="nom" name="nom" className="champ" required autoComplete="name" defaultValue={valeurs.nom} />
      </div>
      <div>
        <label className="etiquette" htmlFor="telephone">Téléphone</label>
        <input id="telephone" name="telephone" type="tel" className="champ" required autoComplete="tel" defaultValue={valeurs.telephone} />
      </div>
      <div>
        <label className="etiquette" htmlFor="vehicule">Véhicule</label>
        <select id="vehicule" name="vehicule" className="champ" defaultValue={valeurs.vehicule}>
          {Object.entries(VEHICULES).map(([id, v]) => (
            <option key={id} value={id}>{v.nom} · {v.charge}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="etiquette" htmlFor="immatriculation">Immatriculation</label>
        <input id="immatriculation" name="immatriculation" className="champ uppercase" required defaultValue={valeurs.immatriculation} />
      </div>
      {etat.erreur && <p className="rounded-bouton bg-erreur-clair p-3 text-petit font-bold text-erreur sm:col-span-2">{etat.erreur}</p>}
      {etat.ok && <p className="rounded-bouton bg-succes-clair p-3 text-petit font-bold text-succes sm:col-span-2">{etat.ok}</p>}
      <button className="bouton sm:col-span-2" disabled={enCours}>{enCours ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}
