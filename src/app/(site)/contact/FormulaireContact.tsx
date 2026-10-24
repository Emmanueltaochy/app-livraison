"use client";

import { useActionState } from "react";
import { envoyerContact } from "@/app/actions/contact";

export function FormulaireContact({ sujet }: { sujet?: string }) {
  const [etat, action, enCours] = useActionState(envoyerContact, {});
  if (etat.ok) return <p className="rounded-carte bg-succes-clair p-6 font-bold text-succes">Message envoyé, merci ! Nous vous répondons rapidement par e-mail.</p>;
  return (
    <form action={action} className="carte grid gap-4 sm:grid-cols-2">
      <div>
        <label className="etiquette" htmlFor="nom">Nom ou société</label>
        <input id="nom" name="nom" className="champ" required autoComplete="name" />
      </div>
      <div>
        <label className="etiquette" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" className="champ" required autoComplete="email" />
      </div>
      <div>
        <label className="etiquette" htmlFor="telephone">Téléphone (facultatif)</label>
        <input id="telephone" name="telephone" type="tel" className="champ" autoComplete="tel" />
      </div>
      <div>
        <label className="etiquette" htmlFor="sujet">Sujet</label>
        <select id="sujet" name="sujet" className="champ" defaultValue={sujet ?? "question"}>
          <option value="question">Une question</option>
          <option value="commande">Une commande en cours</option>
          <option value="compte-pro">Ouvrir un compte professionnel</option>
          <option value="transporteur">Devenir transporteur</option>
          <option value="autre">Autre</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="etiquette" htmlFor="message">Message</label>
        <textarea id="message" name="message" className="champ" rows={6} required />
      </div>
      <input type="text" name="site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {etat.erreur && <p className="rounded-bouton bg-erreur-clair p-3 text-petit font-bold text-erreur sm:col-span-2" role="alert">{etat.erreur}</p>}
      <button className="bouton sm:col-span-2" disabled={enCours}>{enCours ? "Envoi…" : "Envoyer"}</button>
    </form>
  );
}
