"use client";

import { useActionState } from "react";
import { inscrireTransporteur } from "@/app/actions/transporteur";
import { VEHICULES } from "@/lib/pricing";

const CHAMPS = [
  { name: "nom", label: "Nom et prénom", autoComplete: "name" },
  { name: "telephone", label: "Téléphone", type: "tel", autoComplete: "tel" },
  { name: "raison_sociale", label: "Raison sociale (ou nom de l'entreprise individuelle)" },
  { name: "siret", label: "SIRET", inputMode: "numeric" as const },
  { name: "numero_registre_transport", label: "N° d'inscription au registre des transporteurs" },
  { name: "assurance_marchandises", label: "Assurance marchandises (assureur + n° de police)" },
  { name: "immatriculation", label: "Immatriculation du véhicule" },
];

export function FormulaireInscription() {
  const [etat, action, enCours] = useActionState(inscrireTransporteur, {});
  if (etat.ok) return <p className="rounded-lg bg-green-50 p-3 text-green-800">{etat.ok}</p>;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {CHAMPS.map(({ label, ...c }) => (
        <div key={c.name}>
          <label className="etiquette" htmlFor={c.name}>{label}</label>
          <input id={c.name} className="champ" required {...c} />
        </div>
      ))}
      <div>
        <label className="etiquette" htmlFor="vehicule">Type de véhicule</label>
        <select id="vehicule" name="vehicule" className="champ" defaultValue="moyen">
          {Object.entries(VEHICULES).map(([id, v]) => <option key={id} value={id}>{v.nom}</option>)}
        </select>
      </div>
      {etat.erreur && <p className="text-sm text-red-700 sm:col-span-2">{etat.erreur}</p>}
      <button className="bouton sm:col-span-2" disabled={enCours}>{enCours ? "Envoi…" : "Envoyer mon dossier"}</button>
    </form>
  );
}
