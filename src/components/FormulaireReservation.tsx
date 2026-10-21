"use client";

import { useActionState, useMemo, useState } from "react";
import { creerCommande } from "@/app/actions/commandes";
import { COMMUNES } from "@/lib/communes";
import { calculerDevis, euros, VEHICULES, type VehiculeId } from "@/lib/pricing";

const COMMUNES_TRIEES = [...COMMUNES].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

// Valeur par défaut : dans 2 h, arrondie au quart d'heure, en heure de La Réunion.
function dansDeuxHeures(): string {
  const d = new Date(Date.now() + 2 * 3600 * 1000 + 4 * 3600 * 1000);
  d.setUTCMinutes(Math.ceil(d.getUTCMinutes() / 15) * 15, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function FormulaireReservation() {
  const [etat, envoyer, enCours] = useActionState(creerCommande, {});
  const [depart, setDepart] = useState("saint-denis");
  const [arrivee, setArrivee] = useState("saint-pierre");
  const [vehicule, setVehicule] = useState<VehiculeId>("moyen");
  const [date, setDate] = useState(dansDeuxHeures);
  const [aide, setAide] = useState(false);
  const [etagesDepart, setEtagesDepart] = useState(0);
  const [etagesArrivee, setEtagesArrivee] = useState(0);
  const [assurance, setAssurance] = useState(false);
  const [express, setExpress] = useState(false);

  const devis = useMemo(
    () =>
      calculerDevis({
        depart,
        arrivee,
        vehicule,
        aideManutention: aide,
        etagesDepart,
        etagesArrivee,
        assuranceRenforcee: assurance,
        express,
        dateEnlevement: date ? new Date(`${date}:00+04:00`) : undefined,
      }),
    [depart, arrivee, vehicule, aide, etagesDepart, etagesArrivee, assurance, express, date],
  );

  return (
    <form action={envoyer} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <fieldset className="carte space-y-4">
          <legend className="px-1 text-lg font-semibold">1. Trajet</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiquette" htmlFor="commune_depart">Commune de départ</label>
              <select id="commune_depart" name="commune_depart" className="champ" value={depart} onChange={(e) => setDepart(e.target.value)}>
                {COMMUNES_TRIEES.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="etiquette" htmlFor="commune_arrivee">Commune d&apos;arrivée</label>
              <select id="commune_arrivee" name="commune_arrivee" className="champ" value={arrivee} onChange={(e) => setArrivee(e.target.value)}>
                {COMMUNES_TRIEES.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="etiquette" htmlFor="adresse_depart">Adresse d&apos;enlèvement</label>
              <input id="adresse_depart" name="adresse_depart" className="champ" required placeholder="N°, rue, quartier" />
            </div>
            <div>
              <label className="etiquette" htmlFor="adresse_arrivee">Adresse de livraison</label>
              <input id="adresse_arrivee" name="adresse_arrivee" className="champ" required placeholder="N°, rue, quartier" />
            </div>
            <div>
              <label className="etiquette" htmlFor="date_enlevement">Date et heure d&apos;enlèvement</label>
              <input id="date_enlevement" name="date_enlevement" type="datetime-local" className="champ" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="carte space-y-4">
          <legend className="px-1 text-lg font-semibold">2. Véhicule et marchandise</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(VEHICULES) as VehiculeId[]).map((id) => (
              <label key={id} className={`cursor-pointer rounded-xl border-2 p-3 transition ${vehicule === id ? "border-marque bg-teal-50" : "border-slate-200 hover:border-slate-300"}`}>
                <input type="radio" name="vehicule" value={id} checked={vehicule === id} onChange={() => setVehicule(id)} className="sr-only" />
                <span className="block font-semibold">{VEHICULES[id].nom}</span>
                <span className="block text-sm text-slate-600">{VEHICULES[id].description}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="etiquette" htmlFor="description">Que transporte-t-on ?</label>
            <textarea id="description" name="description" className="champ" rows={2} required placeholder="Ex. : 1 réfrigérateur américain + 4 cartons" />
          </div>
        </fieldset>

        <fieldset className="carte space-y-3">
          <legend className="px-1 text-lg font-semibold">3. Options</legend>
          <label className="flex items-center gap-3"><input type="checkbox" name="aide_manutention" checked={aide} onChange={(e) => setAide(e.target.checked)} className="size-5 accent-marque" /> Aide à la manutention (2e personne)</label>
          <label className="flex items-center gap-3"><input type="checkbox" name="express" checked={express} onChange={(e) => setExpress(e.target.checked)} className="size-5 accent-marque" /> Express (enlèvement dans les 2 h)</label>
          <label className="flex items-center gap-3"><input type="checkbox" name="assurance_renforcee" checked={assurance} onChange={(e) => setAssurance(e.target.checked)} className="size-5 accent-marque" /> Assurance renforcée</label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiquette" htmlFor="etages_depart">Étages sans ascenseur au départ</label>
              <input id="etages_depart" name="etages_depart" type="number" min={0} max={30} className="champ" value={etagesDepart} onChange={(e) => setEtagesDepart(Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className="etiquette" htmlFor="etages_arrivee">Étages sans ascenseur à l&apos;arrivée</label>
              <input id="etages_arrivee" name="etages_arrivee" type="number" min={0} max={30} className="champ" value={etagesArrivee} onChange={(e) => setEtagesArrivee(Number(e.target.value) || 0)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="carte space-y-4">
          <legend className="px-1 text-lg font-semibold">4. Vos coordonnées</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="etiquette" htmlFor="client_nom">Nom ou société</label>
              <input id="client_nom" name="client_nom" className="champ" required autoComplete="name" />
            </div>
            <div>
              <label className="etiquette" htmlFor="client_telephone">Téléphone</label>
              <input id="client_telephone" name="client_telephone" type="tel" className="champ" required autoComplete="tel" placeholder="0692 12 34 56" />
            </div>
            <div>
              <label className="etiquette" htmlFor="client_email">E-mail</label>
              <input id="client_email" name="client_email" type="email" className="champ" required autoComplete="email" />
            </div>
          </div>
        </fieldset>
      </div>

      <aside id="recapitulatif" className="scroll-mt-20 lg:sticky lg:top-20 lg:self-start">
        <div className="carte space-y-3">
          <h2 className="text-lg font-semibold">Votre prix</h2>
          <ul className="space-y-1.5 text-sm">
            {devis.lignes.map((l) => (
              <li key={l.libelle} className="flex justify-between gap-2">
                <span className="text-slate-600">{l.libelle}</span>
                <span className="font-medium tabular-nums">{euros(l.montantCts)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t border-slate-200 pt-3">
            <span className="font-semibold">Total TTC</span>
            <span className="text-3xl font-bold text-marque tabular-nums">{euros(devis.totalCts)}</span>
          </div>
          {devis.heurePointe && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Heure de pointe : décalez l&apos;horaire pour payer moins cher.</p>}
          {etat.erreur && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700" role="alert">{etat.erreur}</p>}
          <button type="submit" className="bouton w-full text-lg" disabled={enCours}>
            {enCours ? "Redirection…" : "Réserver et payer"}
          </button>
          <p className="text-center text-xs text-slate-500">Prix fixe, payé en ligne. Transporteurs vérifiés et assurés.</p>
        </div>
      </aside>

      {/* Mobile : le prix reste visible pendant la saisie. */}
      <a href="#recapitulatif" className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 shadow-lg lg:hidden">
        <span className="text-sm text-slate-600">{devis.distanceKm} km · prix fixe</span>
        <span className="text-xl font-bold text-marque tabular-nums">{euros(devis.totalCts)}</span>
      </a>
    </form>
  );
}
