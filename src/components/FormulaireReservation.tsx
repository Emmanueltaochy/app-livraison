"use client";

import { Check, Clock, CreditCard, Lock, ShieldCheck, Truck } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { creerCommande } from "@/app/actions/commandes";
import { COMMUNES, getCommune } from "@/lib/communes";
import { calculerDevis, euros, prochainCreneauCreux, TARIFS, VEHICULES, type VehiculeId } from "@/lib/pricing";

const COMMUNES_TRIEES = [...COMMUNES].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
// Créneaux de prise en charge proposés, toutes les 30 min de 6h à 20h.
const CRENEAUX = Array.from({ length: 29 }, (_, i) => {
  const m = 360 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

const versDate = (jour: string, heure: string) => new Date(`${jour}T${heure}:00+04:00`);
const heureDe = (d: Date) => new Date(d.getTime() + 4 * 3600 * 1000).toISOString().slice(11, 16);

// Premier créneau disponible dans au moins 2 h, en heure de La Réunion.
function creneauParDefaut(): { jour: string; heure: string } {
  const reunion = new Date(Date.now() + 2 * 3600 * 1000 + 4 * 3600 * 1000);
  let minutes = Math.ceil((reunion.getUTCHours() * 60 + reunion.getUTCMinutes()) / 30) * 30;
  if (minutes > 20 * 60) {
    reunion.setUTCDate(reunion.getUTCDate() + 1);
    minutes = 8 * 60;
  }
  minutes = Math.max(minutes, 6 * 60);
  return {
    jour: reunion.toISOString().slice(0, 10),
    heure: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
  };
}

function Section({ numero, titre, children }: { numero: number; titre: string; children: React.ReactNode }) {
  return (
    <fieldset className="carte space-y-5">
      <legend className="sr-only">{titre}</legend>
      <h2 aria-hidden="true" className="flex items-center gap-3 text-h3 font-extrabold">
        <span className="numero-etape">{numero}</span>
        {titre}
      </h2>
      {children}
    </fieldset>
  );
}

function Option(props: { name: string; titre: string; detail: string; prix: string; coche: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-carte border-2 p-4 transition ${props.coche ? "border-noir bg-jaune-clair" : "border-gris-100 hover:border-gris-300"}`}>
      <input type="checkbox" name={props.name} checked={props.coche} onChange={(e) => props.onChange(e.target.checked)} className="peer sr-only" />
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 border-noir peer-focus-visible:shadow-focus ${props.coche ? "bg-jaune" : "bg-blanc"}`}>
        {props.coche && <Check className="size-4" strokeWidth={3} />}
      </span>
      <span className="flex-1">
        <span className="block font-bold">{props.titre}</span>
        <span className="block text-petit text-gris-500">{props.detail}</span>
      </span>
      <span className="chiffres font-extrabold">{props.prix}</span>
    </label>
  );
}

export function FormulaireReservation() {
  const [etat, envoyer, enCours] = useActionState(creerCommande, {});
  const defaut = useMemo(creneauParDefaut, []);
  const [depart, setDepart] = useState("saint-denis");
  const [arrivee, setArrivee] = useState("saint-pierre");
  const [vehicule, setVehicule] = useState<VehiculeId>("moyen");
  const [jour, setJour] = useState(defaut.jour);
  const [heure, setHeure] = useState(defaut.heure);
  const [aide, setAide] = useState(false);
  const [etagesDepart, setEtagesDepart] = useState(0);
  const [etagesArrivee, setEtagesArrivee] = useState(0);
  const [assurance, setAssurance] = useState(false);
  const [express, setExpress] = useState(false);

  const demande = { depart, arrivee, vehicule, aideManutention: aide, etagesDepart, etagesArrivee, assuranceRenforcee: assurance, express };
  const date = versDate(jour, heure);
  const devis = calculerDevis({ ...demande, dateEnlevement: Number.isNaN(date.getTime()) ? undefined : date });
  const creux = devis.heurePointe ? prochainCreneauCreux(date) : null;
  const devisCreux = creux ? calculerDevis({ ...demande, dateEnlevement: creux }) : null;
  const trajet = `${getCommune(depart)?.nom} → ${getCommune(arrivee)?.nom}`;

  const boutonReserver = (
    <button type="submit" className="bouton w-full text-h4" disabled={enCours}>
      <Lock className="size-5" />
      {enCours ? "Redirection vers le paiement…" : `Réserver et payer ${euros(devis.totalCts)}`}
    </button>
  );

  return (
    <form action={envoyer} className="grid items-start gap-5 lg:grid-cols-[1fr_380px]">
      <input type="hidden" name="date_enlevement" value={`${jour}T${heure}`} />
      <div className="space-y-5">
        <Section numero={1} titre="Trajet">
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
              <label className="etiquette" htmlFor="adresse_depart">Adresse de départ</label>
              <input id="adresse_depart" name="adresse_depart" className="champ" required placeholder="N°, rue, quartier" autoComplete="street-address" />
            </div>
            <div>
              <label className="etiquette" htmlFor="adresse_arrivee">Adresse d&apos;arrivée</label>
              <input id="adresse_arrivee" name="adresse_arrivee" className="champ" required placeholder="N°, rue, quartier" />
            </div>
            <div>
              <label className="etiquette" htmlFor="jour">Date</label>
              <input id="jour" type="date" className="champ" required value={jour} min={defaut.jour} onChange={(e) => setJour(e.target.value)} />
            </div>
            <div>
              <label className="etiquette" htmlFor="heure">Heure de prise en charge</label>
              <select id="heure" className="champ chiffres" value={heure} onChange={(e) => setHeure(e.target.value)}>
                {CRENEAUX.map((c) => (
                  <option key={c} value={c}>
                    {c}{calculerDevis({ ...demande, dateEnlevement: versDate(jour, c) }).heurePointe ? " · heure de pointe" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        <Section numero={2} titre="Véhicule">
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(VEHICULES) as VehiculeId[]).map((id) => {
              const v = VEHICULES[id];
              const choisi = vehicule === id;
              return (
                <label key={id} className={`flex cursor-pointer flex-col rounded-carte border-2 p-4 transition ${choisi ? "border-noir shadow-[0_0_0_3px_var(--color-jaune)]" : "border-gris-100 hover:border-gris-300"}`}>
                  <input type="radio" name="vehicule" value={id} checked={choisi} onChange={() => setVehicule(id)} className="peer sr-only" />
                  <span className="flex items-start justify-between">
                    <span className={`flex size-11 items-center justify-center rounded-bouton ${choisi ? "bg-jaune" : "bg-gris-100"}`}>
                      <Truck className="size-6" />
                    </span>
                    <span className={`flex size-6 items-center justify-center rounded-pastille border-2 border-noir ${choisi ? "bg-jaune" : ""}`}>
                      {choisi && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                  </span>
                  <span className="mt-3 font-extrabold">{v.nom}</span>
                  <span className="text-petit text-gris-500">{v.description}</span>
                  <span className="mt-auto flex items-baseline justify-between border-t border-gris-100 pt-3 text-petit">
                    <span className="text-gris-500">{v.charge}</span>
                    <span className="chiffres font-extrabold text-noir">dès {euros(v.minimumCts)}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <div>
            <label className="etiquette" htmlFor="description">Que transportez-vous ?</label>
            <textarea id="description" name="description" className="champ" rows={3} required placeholder="Ex. : canapé 3 places + 6 cartons (achat Leboncoin)" />
            <p className="mt-1.5 text-petit text-gris-500">Précisez les objets lourds ou fragiles : le transporteur s&apos;organise en conséquence.</p>
          </div>
        </Section>

        <Section numero={3} titre="Options">
          <div className="grid gap-3 sm:grid-cols-2">
            <Option name="aide_manutention" titre="Aide à la manutention" detail="Une 2e personne charge avec vous" prix={`+${euros(TARIFS.aideManutentionCts)}`} coche={aide} onChange={setAide} />
            <Option name="express" titre="Express" detail="Prise en charge sous 2 h" prix={`+${Math.round(TARIFS.expressTaux * 100)} %`} coche={express} onChange={setExpress} />
            <Option name="assurance_renforcee" titre="Assurance renforcée" detail="Pour les biens de valeur" prix={`+${euros(TARIFS.assuranceRenforceeCts)}`} coche={assurance} onChange={setAssurance} />
            <div className="rounded-carte border-2 border-gris-100 p-4">
              <p className="font-bold">Étages sans ascenseur</p>
              <p className="text-petit text-gris-500">{euros(TARIFS.parEtageSansAscenseurCts)} par étage</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-petit text-gris-500">
                  Au départ
                  <input name="etages_depart" type="number" min={0} max={30} className="champ chiffres mt-1 h-10" value={etagesDepart} onChange={(e) => setEtagesDepart(Number(e.target.value) || 0)} />
                </label>
                <label className="text-petit text-gris-500">
                  À l&apos;arrivée
                  <input name="etages_arrivee" type="number" min={0} max={30} className="champ chiffres mt-1 h-10" value={etagesArrivee} onChange={(e) => setEtagesArrivee(Number(e.target.value) || 0)} />
                </label>
              </div>
            </div>
          </div>
        </Section>

        <Section numero={4} titre="Vos coordonnées">
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
          <p className="text-petit text-gris-500">Votre numéro est transmis uniquement au transporteur qui accepte la course.</p>
        </Section>
      </div>

      <aside id="recapitulatif" className="scroll-mt-4 overflow-hidden rounded-carte bg-blanc shadow-flottante lg:sticky lg:top-4">
        <div className="bg-noir px-6 py-5 text-blanc">
          <p className="text-petit font-extrabold tracking-widest text-jaune">VOTRE PRIX</p>
          <p className="mt-1 text-h4 font-extrabold">{trajet}</p>
          <p className="chiffres text-petit text-gris-300">{devis.distanceKm} km · {VEHICULES[vehicule].nom}</p>
        </div>
        <div className="space-y-4 p-6">
          <ul className="space-y-2 text-petit">
            {devis.lignes.map((l) => (
              <li key={l.libelle} className="flex justify-between gap-3">
                <span className="text-gris-700">{l.libelle}</span>
                <span className="chiffres font-bold">{euros(l.montantCts)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-end justify-between border-t-2 border-dashed border-gris-300 pt-4">
            <span className="font-bold">Total TTC</span>
            <span className="chiffres large text-prix font-extrabold">{euros(devis.totalCts)}</span>
          </div>
          {devisCreux && creux && (
            <div className="rounded-bouton bg-alerte-clair p-4 text-petit">
              <p className="flex gap-2 text-noir">
                <Clock className="size-5 shrink-0 text-alerte" />
                <span><strong className="text-alerte">Heure de pointe :</strong> décalez l&apos;horaire pour payer moins cher.</span>
              </p>
              <button type="button" onClick={() => setHeure(heureDe(creux))} className="mt-2 rounded-champ border-2 border-info bg-blanc px-3 py-1.5 font-bold text-info hover:bg-info-clair">
                Passer à {heureDe(creux)} · {euros(devisCreux.totalCts)}
              </button>
            </div>
          )}
          {etat.erreur && <p className="rounded-bouton bg-erreur-clair p-3 text-petit font-bold text-erreur" role="alert">{etat.erreur}</p>}
          <div className="hidden lg:block">{boutonReserver}</div>
          <ul className="space-y-1.5 text-petit text-gris-500">
            <li className="flex items-center gap-2"><CreditCard className="size-4" /> Paiement sécurisé par carte, débité à la réservation</li>
            <li className="flex items-center gap-2"><ShieldCheck className="size-4" /> Transporteurs vérifiés et assurés</li>
          </ul>
        </div>
      </aside>

      {/* Mobile : prix et paiement toujours visibles en bas de l'écran. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gris-100 bg-blanc px-4 pt-3 pb-4 shadow-flottante lg:hidden">
        <a href="#recapitulatif" className="mb-2 flex items-end justify-between">
          <span>
            <span className="block text-petit text-gris-500">Total TTC · prix fixe</span>
            <span className="chiffres large text-h2 font-extrabold">{euros(devis.totalCts)}</span>
          </span>
          <span className="text-petit font-bold underline">Détail</span>
        </a>
        {boutonReserver}
      </div>
    </form>
  );
}
