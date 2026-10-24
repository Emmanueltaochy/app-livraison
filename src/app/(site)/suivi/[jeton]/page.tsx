import { ArrowRight, Check, CircleDot, Flag, KeyRound, MapPin, Package, Phone, ShieldCheck, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { getCommune } from "@/lib/communes";
import { une } from "@/lib/db";
import { euros, VEHICULES } from "@/lib/pricing";
import { dateReunion, ETAPES, heureReunion, STATUTS } from "@/lib/statuts";
import { SuiviDirect } from "./SuiviDirect";

export const dynamic = "force-dynamic";

const ICONES_ETAPES = [Truck, Truck, Package, Flag];

const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .map((m) => m[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// Page de suivi publique : accessible uniquement via le jeton secret envoyé au client.
export default async function Suivi({
  params,
  searchParams,
}: {
  params: Promise<{ jeton: string }>;
  searchParams: Promise<{ paye?: string }>;
}) {
  const { jeton } = await params;
  const { paye } = await searchParams;
  if (!/^[a-f0-9]{32}$/.test(jeton)) notFound();

  const c = await une(
    `select c.*, t.raison_sociale, t.immatriculation, u.nom as transporteur_nom, u.telephone as transporteur_telephone
     from commandes c
     left join transporteurs t on t.id = c.transporteur_id
     left join utilisateurs u on u.id = c.transporteur_id
     where c.jeton_suivi = $1`,
    [jeton],
  );
  if (!c) notFound();

  const t = c.transporteur_id
    ? { raison_sociale: c.raison_sociale, immatriculation: c.immatriculation, nom: c.transporteur_nom, telephone: c.transporteur_telephone }
    : null;
  const statut = STATUTS[c.statut];
  const indexEtape = ETAPES.indexOf(c.statut);
  const horodatages = [c.payee_le, c.acceptee_le, c.enlevee_le, c.livree_le];
  const depart = getCommune(c.commune_depart)?.nom;
  const arrivee = getCommune(c.commune_arrivee)?.nom;

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      {paye && c.statut === "attente_paiement" && (
        <p className="rounded-bouton bg-alerte-clair p-4 font-bold text-alerte">
          Paiement en cours de confirmation… la page se mettra à jour toute seule.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-petit text-gris-500">Commande {c.reference} · {dateReunion(c.date_enlevement)}</p>
          <h1 className="titre mt-1 flex flex-wrap items-center gap-x-3 text-h2 sm:text-h1">
            {depart} <ArrowRight className="size-8 sm:size-10" strokeWidth={3} /> {arrivee}
          </h1>
        </div>
        <span className={`pastille ${statut.couleur}`}>{statut.libelle}</span>
      </div>

      {c.statut !== "annulee" && c.statut !== "attente_paiement" && (
        <ol className="carte grid gap-5 sm:grid-cols-4">
          {ETAPES.map((e, i) => {
            const fait = i < indexEtape || c.statut === "livree";
            const actuel = i === indexEtape && c.statut !== "livree";
            const Icone = ICONES_ETAPES[i];
            return (
              <li key={e} className="flex gap-3 sm:block">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-pastille ${
                    fait ? "bg-noir text-jaune" : actuel ? "bg-jaune text-noir shadow-[0_0_0_5px_var(--color-jaune-clair)]" : "border-2 border-gris-300 text-gris-500"
                  }`}
                >
                  {fait ? <Check className="size-4" strokeWidth={3} /> : <Icone className="size-4" />}
                </span>
                <span className="sm:mt-3 sm:block">
                  <span className={`block font-bold ${fait || actuel ? "" : "text-gris-500"}`}>{STATUTS[e].libelle}</span>
                  {horodatages[i] && <span className="chiffres block text-petit text-gris-500">{heureReunion(horodatages[i])}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          {t ? (
            <div className="carte flex flex-wrap items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-pastille bg-noir text-h4 font-extrabold text-jaune">
                {initiales(t.nom ?? t.raison_sociale)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-h4 font-extrabold">
                  {t.nom ?? t.raison_sociale}
                  <span className="pastille bg-gris-100 text-gris-700"><ShieldCheck className="size-3.5" /> Vérifié</span>
                </p>
                <p className="text-petit text-gris-500">{t.raison_sociale} · {VEHICULES[c.vehicule as keyof typeof VEHICULES].nom}</p>
              </div>
              <span className="chiffres rounded-champ border-2 border-noir px-3 py-1.5 font-extrabold tracking-widest">{t.immatriculation}</span>
              {t.telephone && (
                <a href={`tel:${t.telephone}`} className="bouton-noir">
                  <Phone className="size-4" /> Appeler
                </a>
              )}
            </div>
          ) : (
            c.statut === "payee" && (
              <div className="carte flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-pastille bg-alerte-clair text-alerte">
                  <Truck className="size-6" />
                </span>
                <p>
                  <strong>Nous recherchons votre transporteur.</strong>
                  <br />
                  <span className="text-gris-500">Vous verrez ici son nom et son numéro dès qu&apos;il accepte la course.</span>
                </p>
              </div>
            )
          )}
          {["attente_paiement", "payee", "acceptee", "enlevee"].includes(c.statut) && <SuiviDirect jeton={jeton} statutInitial={c.statut} />}
        </div>

        <div className="space-y-5">
          {["acceptee", "enlevee"].includes(c.statut) && (
            <div className="rounded-carte bg-jaune p-6 text-noir">
              <p className="flex items-center gap-2 font-extrabold">
                <KeyRound className="size-5" /> Code de livraison
              </p>
              <p className="chiffres large mt-2 text-[4.5rem] leading-none font-extrabold tracking-[0.25em]">{c.code_livraison}</p>
              <p className="mt-3 text-petit">
                Donnez ce code au transporteur <strong>uniquement</strong> quand vous avez vérifié la marchandise. Il confirme la livraison.
              </p>
            </div>
          )}

          <div className="carte space-y-3">
            <h2 className="text-h4 font-extrabold">Récapitulatif</h2>
            <ul className="space-y-2 text-petit">
              <li className="flex gap-2"><CircleDot className="size-4 shrink-0" /> {c.adresse_depart}, {depart}</li>
              <li className="flex gap-2"><MapPin className="size-4 shrink-0" /> {c.adresse_arrivee}, {arrivee}</li>
              <li className="flex gap-2"><Package className="size-4 shrink-0" /> {c.description}</li>
            </ul>
            <div className="flex items-end justify-between border-t-2 border-dashed border-gris-300 pt-3">
              <span className="font-bold">Payé TTC</span>
              <span className="chiffres large text-h2 font-extrabold">{euros(c.total_cts)}</span>
            </div>
          </div>
          <p className="text-center text-petit text-gris-500">Gardez ce lien : il vous permet de suivre votre commande.</p>
        </div>
      </div>
    </div>
  );
}
