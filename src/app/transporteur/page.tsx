import { ArrowRight, Banknote, Clock, Truck } from "lucide-react";
import Link from "next/link";
import { connecterStripe } from "@/app/actions/transporteur";
import { getCommune } from "@/lib/communes";
import { requete } from "@/lib/db";
import { euros, VEHICULES } from "@/lib/pricing";
import { dateReunion } from "@/lib/statuts";
import { comptePret, stripe, stripeConfigure } from "@/lib/stripe";
import { chargerTransporteur, coursesEnCours, nomCommune } from "./donnees";
import { FormulaireInscription } from "./FormulaireInscription";
import { type CourseDisponible, ListeCourses } from "./ListeCourses";
import { Titre } from "./Pastille";

// Point de chargement approché (~1 km) : l'adresse exacte reste cachée tant que la course n'est pas acceptée.
const approche = (lat: number | null, lng: number | null, commune: string) =>
  lat != null && lng != null ? { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 } : getCommune(commune)!;

// Onglet « Courses » : les courses payées en attente d'un transporteur.
export default async function Courses({ searchParams }: { searchParams: Promise<{ stripe_erreur?: string }> }) {
  const { stripe_erreur: erreurStripe } = await searchParams;
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
    const compte = await stripe().accounts.retrieve(t.stripe_account_id).catch(() => null);
    stripePret = comptePret(compte);
    if (stripePret) await requete("update transporteurs set stripe_pret = true where id = $1", [t.id]);
  }

  const [disponibles, enCours] = await Promise.all([
    requete(
      `select id, reference, commune_depart, commune_arrivee, date_enlevement, description, vehicule, distance_km,
              personnes, volume_m3, demontage, express, remuneration_transporteur_cts, depart_lat, depart_lng
       from commandes where statut = 'payee' and transporteur_id is null
       order by date_enlevement limit 50`,
    ),
    coursesEnCours(t.id),
  ]);

  const courses: CourseDisponible[] = disponibles.map((c) => ({
    id: c.id,
    depart: nomCommune(c.commune_depart),
    arrivee: nomCommune(c.commune_arrivee),
    date: dateReunion(c.date_enlevement),
    description: c.description,
    vehicule: VEHICULES[c.vehicule as keyof typeof VEHICULES].nom,
    distanceKm: c.distance_km,
    personnes: c.personnes,
    volume: c.volume_m3 == null ? null : Number(c.volume_m3),
    demontage: c.demontage,
    express: c.express,
    gain: euros(c.remuneration_transporteur_cts),
    point: approche(c.depart_lat, c.depart_lng, c.commune_depart),
  }));
  const ici = t.position_lat != null && t.position_lng != null ? { lat: t.position_lat, lng: t.position_lng } : undefined;

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
          {erreurStripe && (
            <p className="mt-3 rounded-bouton bg-erreur-clair p-3 text-petit font-bold text-erreur" role="alert">
              Stripe a refusé l&apos;activation : {erreurStripe}
            </p>
          )}
          <form action={connecterStripe}>
            <button className="mt-4 flex h-14 w-full items-center justify-center rounded-bouton bg-noir font-extrabold text-blanc">
              Activer avec Stripe · 2 min
            </button>
          </form>
        </div>
      )}

      <ListeCourses courses={courses} positionInitiale={ici} peutAccepter={stripePret} />
      {courses.length === 0 && (
        <div className="rounded-carte bg-noir-800 p-8 text-center">
          <Truck className="mx-auto size-10 text-jaune" />
          <p className="mt-3 text-h4 font-extrabold">Aucune course disponible</p>
          <p className="text-gris-300">
            {t.en_ligne ? "Restez en ligne : vous serez prévenu dès qu'un client réserve près de vous." : "Les nouvelles courses apparaissent ici dès qu'un client a payé."}
          </p>
        </div>
      )}
    </>
  );
}
