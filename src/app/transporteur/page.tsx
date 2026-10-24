import { ArrowRight, Banknote, Check, Clock, LogOut, Navigation, Package, PackageCheck, Phone, Route, Truck, Users, Zap } from "lucide-react";
import { accepterCourse, basculerEnLigne, connecterStripe, marquerEnlevee } from "@/app/actions/transporteur";
import type { Transporteur } from "@/app/actions/transporteur";
import { deconnexion } from "@/app/connexion/actions";
import { exigerConnexion } from "@/lib/auth";
import { getCommune } from "@/lib/communes";
import { requete, une } from "@/lib/db";
import { euros, VEHICULES } from "@/lib/pricing";
import { dateReunion, STATUTS } from "@/lib/statuts";
import { stripe, stripeConfigure } from "@/lib/stripe";
import { FormulaireInscription } from "./FormulaireInscription";
import { FormulaireLivraison } from "./FormulaireLivraison";
import { SuiviTransporteur } from "./SuiviTransporteur";

export const dynamic = "force-dynamic";

const nomCommune = (id: string) => getCommune(id)?.nom ?? id;
const itineraire = (adresse: string, commune: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${adresse}, ${nomCommune(commune)}, La Réunion`)}`;

function Pastille({ icone: Icone, children, accent }: { icone: typeof Route; children: React.ReactNode; accent?: string }) {
  return (
    <span className={`pastille ${accent ?? "bg-noir-700 text-blanc"}`}>
      <Icone className="size-4" /> {children}
    </span>
  );
}

// Espace transporteur : pensé pour le téléphone, fond noir, gros boutons (≥ 56 px).
export default async function EspaceTransporteur() {
  const u = await exigerConnexion("/transporteur");
  const t = await une<Transporteur>("select * from transporteurs where id = $1", [u.id]);

  const cadre = (titre: string, contenu: React.ReactNode, sousTitre?: string, action?: React.ReactNode) => (
    <div className="bg-noir text-blanc">
      <div className="mx-auto max-w-5xl space-y-8 px-4 pt-6 pb-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            {sousTitre && <p className="text-gris-300">{sousTitre}</p>}
            <h1 className="titre text-h2 sm:text-h1">{titre}</h1>
          </div>
          {action}
          <form action={deconnexion}>
            <button className="flex items-center gap-2 text-petit text-gris-300 hover:text-jaune">
              <LogOut className="size-4" /> Se déconnecter
            </button>
          </form>
        </div>
        {contenu}
      </div>
    </div>
  );

  if (!t) {
    return cadre(
      "Devenir transporteur",
      <div className="space-y-6">
        <p className="max-w-2xl text-gris-300">
          Choisissez vos courses, voyez le montant avant d&apos;accepter, soyez payé après chaque livraison. Le transport
          de marchandises pour autrui exige une inscription au registre des transporteurs (DEAL Réunion) et une
          assurance marchandises : votre dossier est vérifié avant activation.
        </p>
        <div className="rounded-carte bg-blanc p-5 text-noir sm:p-6">
          <FormulaireInscription />
        </div>
      </div>,
      u.email,
    );
  }

  if (t.statut !== "valide") {
    const messages: Record<string, [string, string]> = {
      en_attente: ["Dossier en cours de vérification", "Nous vérifions votre inscription au registre et votre assurance. Vous pourrez accepter des courses dès la validation."],
      refuse: ["Dossier refusé", "Votre dossier n'a pas pu être validé. Contactez-nous pour plus d'informations."],
      suspendu: ["Compte suspendu", "Votre compte est suspendu. Contactez-nous."],
    };
    const [titre, texte] = messages[t.statut];
    return cadre(
      "Espace transporteur",
      <div className="flex gap-4 rounded-carte bg-noir-800 p-6">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-pastille bg-jaune text-noir">
          <Clock className="size-6" />
        </span>
        <div>
          <p className="text-h3 font-extrabold">{titre}</p>
          <p className="mt-1 text-gris-300">{texte}</p>
        </div>
      </div>,
    );
  }

  // Au retour de l'inscription Stripe, on vérifie directement l'état du compte.
  // Sans Stripe configuré (démo locale), on ne bloque pas les transporteurs.
  let stripePret: boolean = t.stripe_pret || !stripeConfigure();
  if (t.stripe_account_id && !stripePret && stripeConfigure()) {
    const compte = await stripe().accounts.retrieve(t.stripe_account_id);
    stripePret = Boolean(compte.charges_enabled && compte.payouts_enabled);
    if (stripePret) await requete("update transporteurs set stripe_pret = true where id = $1", [t.id]);
  }

  const [disponibles, mesCourses] = await Promise.all([
    requete(
      `select id, reference, commune_depart, commune_arrivee, date_enlevement, description, vehicule, distance_km,
              aide_manutention, express, remuneration_transporteur_cts
       from commandes where statut = 'payee' and transporteur_id is null
       order by date_enlevement limit 50`,
    ),
    requete("select * from commandes where transporteur_id = $1 order by date_enlevement desc limit 50", [t.id]),
  ]);

  const enCours = mesCourses.filter((c) => ["acceptee", "enlevee"].includes(c.statut));
  const terminees = mesCourses.filter((c) => !["acceptee", "enlevee"].includes(c.statut));
  const gainsCts = terminees.filter((c) => c.statut === "livree").reduce((s, c) => s + c.remuneration_transporteur_cts, 0);

  const pastilleEnLigne = (
    <form action={basculerEnLigne}>
      <input type="hidden" name="en_ligne" value={t.en_ligne ? "0" : "1"} />
      <button
        className={`flex h-12 items-center gap-2 rounded-pastille px-5 font-extrabold ${t.en_ligne ? "bg-succes-clair text-succes" : "bg-noir-700 text-gris-300"}`}
        aria-label={t.en_ligne ? "Vous êtes en ligne. Passer hors ligne" : "Vous êtes hors ligne. Passer en ligne"}
      >
        <span className={`size-3 rounded-pastille ${t.en_ligne ? "bg-succes" : "bg-gris-500"}`} />
        {t.en_ligne ? "En ligne" : "Hors ligne"}
      </button>
    </form>
  );

  return cadre(
    "Courses",
    <>
      <SuiviTransporteur enLigne={t.en_ligne} enCourse={enCours.length > 0} />
      {!t.en_ligne && enCours.length === 0 && (
        <p className="rounded-carte bg-noir-800 p-4 text-gris-300">
          Passez <strong className="text-blanc">en ligne</strong> pour recevoir les courses immédiates près de vous. Les courses programmées restent visibles ci-dessous.
        </p>
      )}
      {!stripePret && (
        <div className="rounded-carte bg-jaune p-5 text-noir">
          <p className="flex items-center gap-3 text-h4 font-extrabold">
            <Banknote className="size-7" /> Activez vos virements
          </p>
          <p className="mt-1">Renseignez votre IBAN avec Stripe pour être payé après chaque livraison.</p>
          <form action={connecterStripe}>
            <button className="mt-4 flex h-14 w-full items-center justify-center rounded-bouton bg-noir font-extrabold text-blanc">
              Activer avec Stripe · 2 min
            </button>
          </form>
        </div>
      )}

      {enCours.map((c) => {
        const charge = c.statut === "enlevee";
        return (
          <section key={c.id} aria-label={`Course ${c.reference}`} className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-gris-300">En cours · {c.reference}</p>
                <h2 className="titre text-h2">{charge ? "Étape 2 : livraison" : "Étape 1 : chargement"}</h2>
              </div>
              <p className="chiffres large text-h2 font-extrabold text-jaune">{euros(c.remuneration_transporteur_cts)}</p>
            </div>
            <div className={`rounded-carte p-5 ${charge ? "bg-noir-800" : "bg-blanc text-noir"}`}>
              <p className={`text-petit font-extrabold tracking-wider ${charge ? "text-gris-300" : ""}`}>
                CHARGEMENT · {dateReunion(c.date_enlevement).toUpperCase()}
              </p>
              <p className="mt-1 text-h3 font-extrabold">{c.adresse_depart}</p>
              <p className={charge ? "text-gris-300" : "text-gris-500"}>
                {nomCommune(c.commune_depart)}
                {c.etages_depart > 0 && ` · ${c.etages_depart}e étage, sans ascenseur`}
              </p>
            </div>
            <div className={`rounded-carte p-5 ${charge ? "bg-blanc text-noir" : "bg-noir-800"}`}>
              <p className={`text-petit font-extrabold tracking-wider ${charge ? "" : "text-gris-300"}`}>LIVRAISON · {c.distance_km} KM</p>
              <p className="mt-1 text-h3 font-extrabold">{c.adresse_arrivee}</p>
              <p className={charge ? "text-gris-500" : "text-gris-300"}>
                {nomCommune(c.commune_arrivee)}
                {c.etages_arrivee > 0 && ` · ${c.etages_arrivee}e étage, sans ascenseur`}
              </p>
            </div>
            <div className="flex gap-3 rounded-carte bg-noir-800 p-5">
              <Package className="size-6 shrink-0 text-jaune" />
              <p>
                {c.description}
                {c.aide_manutention && <span className="block text-gris-300">Aide à la manutention (2 personnes)</span>}
              </p>
            </div>
            <a href={`tel:${c.client_telephone}`} className="flex h-16 items-center justify-center gap-3 rounded-carte border-2 border-blanc text-h4 font-extrabold">
              <Phone className="size-6" /> Appeler {c.client_nom.split(" ")[0]} · {c.client_telephone}
            </a>
            <div className={`grid gap-3 ${charge ? "" : "grid-cols-[1fr_1.4fr]"}`}>
              <a
                href={charge ? itineraire(c.adresse_arrivee, c.commune_arrivee) : itineraire(c.adresse_depart, c.commune_depart)}
                target="_blank"
                rel="noreferrer"
                className="flex h-16 items-center justify-center gap-2 rounded-carte border-2 border-blanc font-extrabold"
              >
                <Navigation className="size-5" /> Itinéraire
              </a>
              {!charge && (
                <form action={marquerEnlevee}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="bouton h-16 w-full rounded-carte text-h4">
                    <PackageCheck className="size-6" /> Marchandise chargée
                  </button>
                </form>
              )}
            </div>
            {charge && <FormulaireLivraison id={c.id} commune={nomCommune(c.commune_arrivee)} />}
          </section>
        );
      })}

      <section aria-label="Courses disponibles" className="space-y-4">
        {enCours.length > 0 && <h2 className="titre text-h3">Courses disponibles</h2>}
        {disponibles.length === 0 && (
          <div className="rounded-carte bg-noir-800 p-8 text-center">
            <Truck className="mx-auto size-10 text-jaune" />
            <p className="mt-3 text-h4 font-extrabold">Aucune course disponible</p>
            <p className="text-gris-300">Les nouvelles courses apparaissent ici dès qu&apos;un client a payé.</p>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {disponibles.map((c) => (
            <article key={c.id} className="space-y-4 rounded-carte border border-noir-700 bg-noir-800 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-h4 font-extrabold">{nomCommune(c.commune_depart)}</p>
                  <p className="flex items-center gap-1 text-h4 font-extrabold">
                    <ArrowRight className="size-5" strokeWidth={3} /> {nomCommune(c.commune_arrivee)}
                  </p>
                  <p className="mt-1 text-gris-300">{dateReunion(c.date_enlevement)}</p>
                </div>
                <div className="text-right">
                  <p className="text-petit font-extrabold tracking-wider text-gris-300">VOUS GAGNEZ</p>
                  <p className="chiffres large text-h2 font-extrabold text-jaune">{euros(c.remuneration_transporteur_cts)}</p>
                </div>
              </div>
              <p className="flex flex-wrap gap-2">
                <Pastille icone={Route}>{c.distance_km} km</Pastille>
                <Pastille icone={Truck}>{VEHICULES[c.vehicule as keyof typeof VEHICULES].nom}</Pastille>
                {c.aide_manutention && <Pastille icone={Users} accent="bg-blanc text-noir">2 personnes</Pastille>}
                {c.express && <Pastille icone={Zap} accent="bg-jaune text-noir">Express</Pastille>}
              </p>
              <p className="text-petit text-gris-300">{c.description}</p>
              <form action={accepterCourse}>
                <input type="hidden" name="id" value={c.id} />
                <button className="bouton h-16 w-full rounded-carte text-h4" disabled={!stripePret}>
                  <Check className="size-6" strokeWidth={3} /> Accepter la course
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section aria-label="Historique" className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="titre text-h3">Historique</h2>
          <p className="text-gris-300">
            Total gagné <span className="chiffres text-h4 font-extrabold text-jaune">{euros(gainsCts)}</span>
          </p>
        </div>
        <ul className="divide-y divide-noir-700 rounded-carte bg-noir-800">
          {terminees.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 p-4">
              <span>
                <span className="block font-bold">{nomCommune(c.commune_depart)} → {nomCommune(c.commune_arrivee)}</span>
                <span className="text-petit text-gris-300">{c.reference} · {dateReunion(c.date_enlevement)}</span>
              </span>
              <span className="text-right">
                <span className="chiffres block font-extrabold">{euros(c.remuneration_transporteur_cts)}</span>
                <span className={`pastille ${STATUTS[c.statut].couleur}`}>{STATUTS[c.statut].court}</span>
              </span>
            </li>
          ))}
          {terminees.length === 0 && <li className="p-4 text-gris-300">Aucune course terminée pour l&apos;instant.</li>}
        </ul>
      </section>
    </>,
    u.email,
    pastilleEnLigne,
  );
}
