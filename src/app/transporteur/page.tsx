import { ArrowRight, Banknote, Check, Clock, Route, Truck, Users, Zap } from "lucide-react";
import Link from "next/link";
import { accepterCourse, connecterStripe } from "@/app/actions/transporteur";
import { requete } from "@/lib/db";
import { euros, VEHICULES } from "@/lib/pricing";
import { dateReunion } from "@/lib/statuts";
import { stripe, stripeConfigure } from "@/lib/stripe";
import { chargerTransporteur, coursesEnCours, nomCommune } from "./donnees";
import { FormulaireInscription } from "./FormulaireInscription";
import { Pastille, Titre } from "./Pastille";

// Onglet « Courses » : les courses payées en attente d'un transporteur.
export default async function Courses() {
  const { u, t } = await chargerTransporteur();

  if (!t) {
    return (
      <>
        <Titre sousTitre={u.email}>Devenir transporteur</Titre>
        <p className="max-w-2xl text-gris-300">
          Choisissez vos courses, voyez le montant avant d&apos;accepter, soyez payé après chaque livraison. Le transport
          de marchandises pour autrui exige une inscription au registre des transporteurs (DEAL Réunion) et une
          assurance marchandises : votre dossier est vérifié avant activation.
        </p>
        <div className="rounded-carte bg-blanc p-5 text-noir sm:p-6">
          <FormulaireInscription />
        </div>
      </>
    );
  }

  if (t.statut !== "valide") {
    const messages: Record<string, [string, string]> = {
      en_attente: ["Dossier en cours de vérification", "Nous vérifions votre inscription au registre et votre assurance. Vous pourrez accepter des courses dès la validation."],
      refuse: ["Dossier refusé", "Votre dossier n'a pas pu être validé. Contactez-nous pour plus d'informations."],
      suspendu: ["Compte suspendu", "Votre compte est suspendu. Contactez-nous."],
    };
    const [titre, texte] = messages[t.statut];
    return (
      <>
        <Titre>Espace transporteur</Titre>
        <div className="flex gap-4 rounded-carte bg-noir-800 p-6">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-pastille bg-jaune text-noir">
            <Clock className="size-6" />
          </span>
          <div>
            <p className="text-h3 font-extrabold">{titre}</p>
            <p className="mt-1 text-gris-300">{texte}</p>
          </div>
        </div>
      </>
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

  const [disponibles, enCours] = await Promise.all([
    requete(
      `select id, reference, commune_depart, commune_arrivee, date_enlevement, description, vehicule, distance_km,
              aide_manutention, express, remuneration_transporteur_cts
       from commandes where statut = 'payee' and transporteur_id is null
       order by date_enlevement limit 50`,
    ),
    coursesEnCours(t.id),
  ]);

  return (
    <>
      <Titre>Courses disponibles</Titre>

      {enCours.length > 0 && (
        <Link href="/transporteur/en-cours" className="flex items-center justify-between gap-3 rounded-carte bg-jaune p-5 font-extrabold text-noir">
          <span className="flex items-center gap-3">
            <Truck className="size-6" /> {enCours.length === 1 ? "1 course en cours" : `${enCours.length} courses en cours`}
          </span>
          <ArrowRight className="size-5" strokeWidth={3} />
        </Link>
      )}

      {!t.en_ligne && enCours.length === 0 && (
        <p className="rounded-carte bg-noir-800 p-4 text-gris-300">
          Passez <strong className="text-blanc">en ligne</strong> (en haut à droite) pour recevoir les courses immédiates près de vous. Les courses programmées restent visibles ci-dessous.
        </p>
      )}

      {!stripePret && (
        <div className="rounded-carte bg-blanc p-5 text-noir">
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

      <section aria-label="Courses disponibles" className="space-y-4">
        {disponibles.length === 0 && (
          <div className="rounded-carte bg-noir-800 p-8 text-center">
            <Truck className="mx-auto size-10 text-jaune" />
            <p className="mt-3 text-h4 font-extrabold">Aucune course disponible</p>
            <p className="text-gris-300">
              {t.en_ligne ? "Restez en ligne : vous serez prévenu dès qu'un client réserve près de vous." : "Les nouvelles courses apparaissent ici dès qu'un client a payé."}
            </p>
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
    </>
  );
}
