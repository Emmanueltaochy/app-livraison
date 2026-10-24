"use client";

import { ArrowLeft, ArrowRight, CalendarClock, Check, Clock, CreditCard, Lock, ShieldCheck, Truck, Users, Zap } from "lucide-react";
import { useActionState, useMemo, useRef, useState } from "react";
import { creerCommande } from "@/app/actions/commandes";
import { getCommune } from "@/lib/communes";
import { decrire, resumer, type Inventaire, type TypeTransport } from "@/lib/inventaire";
import {
  calculerDevis,
  dureeLisible,
  euros,
  personnesConseillees,
  personnesMinimum,
  prochainCreneauCreux,
  TARIFS,
  vehiculeConseille,
  vehiculeSuffit,
  VEHICULES,
  type VehiculeId,
} from "@/lib/pricing";
import { ChoixInventaire } from "./ChoixInventaire";
import { CarteTrajet } from "./CarteTrajet";
import { ChampAdresse, type Adresse } from "./ChampAdresse";

// Créneaux de prise en charge proposés, toutes les 30 min de 6h à 20h.
const CRENEAUX = Array.from({ length: 29 }, (_, i) => {
  const m = 360 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});
const ETAPES = ["Trajet", "Quoi", "Quand", "Véhicule", "Options", "Coordonnées"] as const;
// Doit correspondre au délai appliqué côté serveur pour une commande « Maintenant ».
const DELAI_MAINTENANT_MS = 60 * 60 * 1000;

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

// Sur mobile, une seule section est visible à la fois ; sur ordinateur, tout le formulaire.
function Section(props: { numero: number; etape: number; titre: string; children: React.ReactNode; refSection?: React.Ref<HTMLFieldSetElement> }) {
  return (
    <fieldset ref={props.refSection} className={`carte space-y-5 ${props.numero === props.etape ? "" : "max-lg:hidden"}`}>
      <legend className="sr-only">{props.titre}</legend>
      <h2 aria-hidden="true" className="flex items-center gap-3 text-h3 font-extrabold">
        <span className="numero-etape">{props.numero}</span>
        {props.titre}
      </h2>
      {props.children}
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

function ChoixMode(props: { actif: boolean; onClick: () => void; icone: typeof Zap; titre: string; detail: string }) {
  const Icone = props.icone;
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.actif}
      className={`flex items-center gap-3 rounded-carte border-2 p-4 text-left transition ${props.actif ? "border-noir bg-jaune-clair" : "border-gris-100 hover:border-gris-300"}`}
    >
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-bouton ${props.actif ? "bg-jaune" : "bg-gris-100"}`}>
        <Icone className="size-6" />
      </span>
      <span>
        <span className="block font-extrabold">{props.titre}</span>
        <span className="block text-petit text-gris-500">{props.detail}</span>
      </span>
    </button>
  );
}

export function FormulaireReservation() {
  const [etat, envoyer, enCours] = useActionState(creerCommande, {});
  const defaut = useMemo(creneauParDefaut, []);
  const [etape, setEtape] = useState(1);
  const sections = useRef<(HTMLFieldSetElement | null)[]>([]);
  const [depart, setDepart] = useState<Adresse>({ libelle: "", commune: "saint-denis" });
  const [arrivee, setArrivee] = useState<Adresse>({ libelle: "", commune: "saint-pierre" });
  const [mode, setMode] = useState<"programme" | "maintenant">("programme");
  const [type, setType] = useState<TypeTransport>("objets");
  const [inventaire, setInventaire] = useState<Inventaire>({});
  const [vehiculeChoisi, setVehiculeChoisi] = useState<VehiculeId | null>(null);
  const [personnesChoisies, setPersonnesChoisies] = useState<number | null>(null);
  const [jour, setJour] = useState(defaut.jour);
  const [heure, setHeure] = useState(defaut.heure);
  const [etagesDepart, setEtagesDepart] = useState(0);
  const [etagesArrivee, setEtagesArrivee] = useState(0);
  const [ascenseurDepart, setAscenseurDepart] = useState(false);
  const [ascenseurArrivee, setAscenseurArrivee] = useState(false);
  const [portageLong, setPortageLong] = useState(false);
  const [demontage, setDemontage] = useState(false);
  const [assurance, setAssurance] = useState(false);
  const [alerte, setAlerte] = useState<string>();

  // Le contenu impose le véhicule minimum et l'équipe minimum ; le client peut prendre plus grand.
  const contenu = resumer(inventaire);
  const conseille = contenu.nombre ? vehiculeConseille(contenu) : "petit";
  const vehicule: VehiculeId = vehiculeChoisi && vehiculeSuffit(vehiculeChoisi, conseille) ? vehiculeChoisi : (conseille ?? "grand");
  const minimumPersonnes = personnesMinimum(contenu, type);
  const personnes = Math.max(personnesChoisies ?? personnesConseillees(contenu, type), minimumPersonnes);

  const maintenant = mode === "maintenant";
  const demande = {
    depart: depart.commune,
    arrivee: arrivee.commune,
    pointDepart: depart.point,
    pointArrivee: arrivee.point,
    vehicule,
    inventaire,
    personnes,
    accesDepart: { etage: etagesDepart, ascenseur: ascenseurDepart },
    accesArrivee: { etage: etagesArrivee, ascenseur: ascenseurArrivee },
    portageLong,
    demontage: demontage && contenu.demontage > 0,
    assuranceRenforcee: assurance,
    express: maintenant,
  };
  const date = maintenant ? new Date(Date.now() + DELAI_MAINTENANT_MS) : versDate(jour, heure);
  const devis = calculerDevis({ ...demande, dateEnlevement: Number.isNaN(date.getTime()) ? undefined : date });
  const creux = !maintenant && devis.heurePointe ? prochainCreneauCreux(date) : null;
  const devisCreux = creux ? calculerDevis({ ...demande, dateEnlevement: creux }) : null;
  const trajet = `${getCommune(depart.commune)?.nom} → ${getCommune(arrivee.commune)?.nom}`;

  // Avant de passer à l'étape suivante (mobile), on vérifie les champs de l'étape en cours.
  const continuer = () => {
    const champs = sections.current[etape - 1]?.querySelectorAll<HTMLInputElement>("input, select, textarea");
    for (const champ of champs ?? []) if (!champ.reportValidity()) return;
    if (ETAPES[etape - 1] === "Quoi" && (!contenu.nombre || !conseille)) {
      setAlerte(contenu.nombre ? "Trop volumineux pour un seul voyage : contactez-nous pour un devis sur mesure." : "Ajoutez au moins un objet.");
      return;
    }
    setAlerte(undefined);
    setEtape((e) => Math.min(e + 1, ETAPES.length));
    window.scrollTo({ top: document.getElementById("reserver")?.offsetTop ?? 0, behavior: "smooth" });
  };

  const boutonReserver = (
    <button type="submit" className="bouton w-full text-h4" disabled={enCours}>
      <Lock className="size-5" />
      {enCours ? "Redirection vers le paiement…" : `Réserver et payer ${euros(devis.totalCts)}`}
    </button>
  );

  return (
    <form action={envoyer} className="grid items-start gap-5 lg:grid-cols-[1fr_380px]">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="express" value={maintenant ? "on" : ""} />
      <input type="hidden" name="date_enlevement" value={maintenant ? "" : `${jour}T${heure}`} />
      <input type="hidden" name="type_transport" value={type} />
      <input type="hidden" name="inventaire" value={JSON.stringify(inventaire)} />
      <input type="hidden" name="vehicule" value={vehicule} />
      <input type="hidden" name="personnes" value={personnes} />

      <div className="space-y-5">
        {/* Progression (mobile uniquement) */}
        <div className="rounded-carte bg-blanc p-4 shadow-carte lg:hidden">
          <p className="flex justify-between text-petit font-bold">
            <span>Étape {etape} sur {ETAPES.length} · {ETAPES[etape - 1]}</span>
            {etape > 1 && (
              <button type="button" onClick={() => setEtape(etape - 1)} className="flex items-center gap-1 underline">
                <ArrowLeft className="size-4" /> Retour
              </button>
            )}
          </p>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {ETAPES.map((e, i) => (
              <span key={e} className={`h-1.5 rounded-pastille ${i < etape ? "bg-jaune" : "bg-gris-100"}`} />
            ))}
          </div>
        </div>

        <Section numero={1} etape={etape} titre="Trajet" refSection={(el) => { sections.current[0] = el; }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ChampAdresse prefixe="depart" libelle="Adresse de départ" valeur={depart} onChange={setDepart} />
            <ChampAdresse prefixe="arrivee" libelle="Adresse d'arrivée" valeur={arrivee} onChange={setArrivee} />
          </div>
          <CarteTrajet depart={depart.point} arrivee={arrivee.point} className="h-56 sm:h-72" />
          {depart.point && arrivee.point && (
            <p className="chiffres text-petit font-bold">{trajet} · environ {devis.distanceKm} km par la route</p>
          )}
        </Section>

        <Section numero={2} etape={etape} titre="Quoi ?" refSection={(el) => { sections.current[1] = el; }}>
          <ChoixInventaire type={type} onType={setType} inventaire={inventaire} onInventaire={(i) => { setInventaire(i); setAlerte(undefined); }} />
          {contenu.nombre > 0 && !conseille && (
            <p className="rounded-bouton bg-erreur-clair p-3 text-petit font-bold text-erreur">Plus de 20 m³ ou 1,5 t : contactez-nous pour un devis sur mesure (plusieurs voyages).</p>
          )}
          {alerte && <p className="rounded-bouton bg-erreur-clair p-3 text-petit font-bold text-erreur" role="alert">{alerte}</p>}
        </Section>

        <Section numero={3} etape={etape} titre="Quand ?" refSection={(el) => { sections.current[2] = el; }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoixMode actif={maintenant} onClick={() => setMode("maintenant")} icone={Zap} titre="Maintenant" detail={`Prise en charge dans l'heure · +${Math.round(TARIFS.expressTaux * 100)} %`} />
            <ChoixMode actif={!maintenant} onClick={() => setMode("programme")} icone={CalendarClock} titre="Programmer" detail="Choisissez le jour et l'heure" />
          </div>
          {!maintenant && (
            <div className="grid gap-4 sm:grid-cols-2">
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
          )}
        </Section>

        <Section numero={4} etape={etape} titre="Véhicule" refSection={(el) => { sections.current[3] = el; }}>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(VEHICULES) as VehiculeId[]).map((id) => {
              const v = VEHICULES[id];
              const choisi = vehicule === id;
              const possible = vehiculeSuffit(id, conseille);
              return (
                <label
                  key={id}
                  className={`flex flex-col rounded-carte border-2 p-4 transition ${!possible ? "cursor-not-allowed opacity-45" : "cursor-pointer"} ${choisi ? "border-noir shadow-[0_0_0_3px_var(--color-jaune)]" : "border-gris-100 hover:border-gris-300"}`}
                >
                  <input type="radio" name="choix_vehicule" value={id} checked={choisi} disabled={!possible} onChange={() => setVehiculeChoisi(id)} className="peer sr-only" />
                  <span className="flex items-start justify-between">
                    <span className={`flex size-11 items-center justify-center rounded-bouton ${choisi ? "bg-jaune" : "bg-gris-100"}`}>
                      <Truck className="size-6" />
                    </span>
                    {id === conseille && contenu.nombre > 0 ? (
                      <span className="rounded-pastille bg-noir px-2 py-0.5 text-[0.75rem] font-extrabold text-jaune">Conseillé</span>
                    ) : (
                      <span className={`flex size-6 items-center justify-center rounded-pastille border-2 border-noir ${choisi ? "bg-jaune" : ""}`}>
                        {choisi && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    )}
                  </span>
                  <span className="mt-3 font-extrabold">{v.nom}</span>
                  <span className="text-petit text-gris-500">{possible ? v.description : "Trop petit pour votre chargement"}</span>
                  <span className="mt-auto flex items-baseline justify-between border-t border-gris-100 pt-3 text-petit">
                    <span className="text-gris-500">{v.charge}</span>
                    <span className="chiffres font-extrabold text-noir">dès {euros(v.minimumCts)}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {contenu.nombre > 0 && (
            <p className="text-petit text-gris-500">
              Votre chargement : {contenu.volume.toLocaleString("fr-FR")} m³ · {Math.round(contenu.poids)} kg{contenu.hayon ? " · hayon nécessaire" : ""}.
            </p>
          )}
        </Section>

        <Section numero={5} etape={etape} titre="Accès et options" refSection={(el) => { sections.current[4] = el; }}>
          <div className="rounded-carte border-2 border-gris-100 p-4">
            <p className="flex items-center gap-2 font-bold"><Users className="size-5" /> Combien de personnes pour porter ?</p>
            <p className="text-petit text-gris-500">
              Le chauffeur compte pour une. {minimumPersonnes > 1 ? `Minimum ${minimumPersonnes} pour votre chargement.` : "Seul, vous aidez au chargement."} +{euros(TARIFS.personneSupplementaireCts)} par personne en plus.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:max-w-sm">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={n < minimumPersonnes}
                  aria-pressed={personnes === n}
                  onClick={() => setPersonnesChoisies(n)}
                  className={`h-12 rounded-bouton border-2 font-extrabold disabled:cursor-not-allowed disabled:opacity-40 ${personnes === n ? "border-noir bg-jaune" : "border-gris-100"}`}
                >
                  {n}
                </button>
              ))}
            </div>
            {contenu.nombre > 0 && (
              <p className="mt-2 text-petit text-gris-500">
                Chargement et déchargement : environ {dureeLisible(devis.dureeSurPlaceMin)} à {personnes}. {VEHICULES[vehicule].minutesIncluses} min de manutention incluses, puis {euros(TARIFS.minuteManutentionCts * 60)}/h.
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["Au départ", etagesDepart, setEtagesDepart, ascenseurDepart, setAscenseurDepart, "etages_depart", "ascenseur_depart"],
              ["À l'arrivée", etagesArrivee, setEtagesArrivee, ascenseurArrivee, setAscenseurArrivee, "etages_arrivee", "ascenseur_arrivee"],
            ] as const).map(([titre, etage, setEtage, asc, setAsc, nomEtage, nomAsc]) => (
              <div key={nomEtage} className="rounded-carte border-2 border-gris-100 p-4">
                <p className="font-bold">{titre}</p>
                <div className="mt-2 flex items-end gap-3">
                  <label className="w-24 text-petit text-gris-500">
                    Étage
                    <input name={nomEtage} type="number" min={0} max={30} className="champ chiffres mt-1 h-10" value={etage} onChange={(e) => setEtage(Number(e.target.value) || 0)} />
                  </label>
                  <label className={`flex h-10 flex-1 items-center gap-2 text-petit font-bold ${etage === 0 ? "opacity-40" : ""}`}>
                    <input type="checkbox" name={nomAsc} checked={asc} disabled={etage === 0} onChange={(e) => setAsc(e.target.checked)} className="size-5 accent-noir" />
                    Ascenseur
                  </label>
                </div>
                <p className="mt-1 text-[0.8rem] text-gris-500">0 = rez-de-chaussée ou maison. Sans ascenseur : +15 % de manutention par étage.</p>
              </div>
            ))}
            <Option name="portage_long" titre="Camion loin de la porte" detail="Plus de 30 m à pied : +25 % de temps de manutention" prix={`+${Math.round(TARIFS.portageLongTaux * 100)} %`} coche={portageLong} onChange={setPortageLong} />
            {contenu.demontage > 0 && (
              <Option name="demontage" titre="Démontage et remontage" detail={`Lit, armoire, table… environ ${dureeLisible(contenu.demontage * 2)} de travail`} prix={`+${euros(contenu.demontage * 2 * TARIFS.minuteManutentionCts)}`} coche={demontage} onChange={setDemontage} />
            )}
            <Option name="assurance_renforcee" titre="Assurance renforcée" detail="Pour les biens de valeur" prix={`+${euros(TARIFS.assuranceRenforceeCts)}`} coche={assurance} onChange={setAssurance} />
          </div>
          <div>
            <label className="etiquette" htmlFor="precisions">Précisions pour le transporteur (facultatif)</label>
            <textarea id="precisions" name="precisions" className="champ" rows={2} placeholder="Ex. : retrait au dépôt Leroy Merlin, code portail 1234, objet fragile…" />
          </div>
        </Section>

        <Section numero={6} etape={etape} titre="Vos coordonnées" refSection={(el) => { sections.current[5] = el; }}>
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

      <aside id="recapitulatif" className={`scroll-mt-4 overflow-hidden rounded-carte bg-blanc shadow-flottante lg:sticky lg:top-4 ${etape === ETAPES.length ? "" : "max-lg:hidden"}`}>
        <div className="bg-noir px-6 py-5 text-blanc">
          <p className="text-petit font-extrabold tracking-widest text-jaune">VOTRE PRIX</p>
          <p className="mt-1 text-h4 font-extrabold">{trajet}</p>
          <p className="chiffres text-petit text-gris-300">
            {devis.distanceKm} km · {VEHICULES[vehicule].nom}{contenu.nombre > 0 && ` · ${contenu.volume.toLocaleString("fr-FR")} m³`} · {maintenant ? "maintenant" : `${new Date(`${jour}T12:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à ${heure}`}
          </p>
        </div>
        <div className="space-y-4 p-6">
          {contenu.nombre > 0 && <p className="text-petit text-gris-500">{decrire(inventaire)}</p>}
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

      {/* Mobile : prix toujours visible ; « Continuer » jusqu'à la dernière étape, puis paiement. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gris-100 bg-blanc px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-flottante lg:hidden">
        <p className="mb-2 flex items-end justify-between">
          <span>
            <span className="block text-petit text-gris-500">Total TTC · prix fixe</span>
            <span className="chiffres large text-h2 font-extrabold">{euros(devis.totalCts)}</span>
          </span>
          <span className="chiffres text-petit text-gris-500">{devis.distanceKm} km</span>
        </p>
        {etape < ETAPES.length ? (
          <button type="button" onClick={continuer} className="bouton w-full text-h4">
            Continuer <ArrowRight className="size-5" />
          </button>
        ) : (
          boutonReserver
        )}
      </div>
    </form>
  );
}
