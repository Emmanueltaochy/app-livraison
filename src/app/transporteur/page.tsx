import { accepterCourse, connecterStripe, marquerEnlevee } from "@/app/actions/transporteur";
import { deconnexion } from "@/app/connexion/actions";
import { getCommune } from "@/lib/communes";
import { euros, VEHICULES } from "@/lib/pricing";
import { dateReunion, STATUTS } from "@/lib/statuts";
import { stripe, stripeConfigure } from "@/lib/stripe";
import { exigerConnexion } from "@/lib/auth";
import { requete, une } from "@/lib/db";
import type { Transporteur } from "@/app/actions/transporteur";
import { FormulaireInscription } from "./FormulaireInscription";
import { FormulaireLivraison } from "./FormulaireLivraison";

export const dynamic = "force-dynamic";

const nomCommune = (id: string) => getCommune(id)?.nom ?? id;

export default async function EspaceTransporteur() {
  const u = await exigerConnexion("/transporteur");
  const t = await une<Transporteur>("select * from transporteurs where id = $1", [u.id]);

  const entete = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">Espace transporteur</h1>
      <form action={deconnexion}>
        <button className="text-sm text-slate-500 underline">Se déconnecter ({u.email})</button>
      </form>
    </div>
  );

  if (!t) {
    return (
      <div className="mx-auto max-w-2xl">
        {entete}
        <div className="carte space-y-4">
          <h2 className="text-lg font-semibold">Devenir transporteur partenaire</h2>
          <p className="text-sm text-slate-600">
            Le transport de marchandises pour le compte d&apos;autrui exige une inscription au registre des
            transporteurs (DEAL Réunion) et une assurance marchandises. Votre dossier est vérifié avant activation.
          </p>
          <FormulaireInscription />
        </div>
      </div>
    );
  }

  if (t.statut !== "valide") {
    const messages: Record<string, string> = {
      en_attente: "Votre dossier est en cours de vérification. Vous serez prévenu dès sa validation.",
      refuse: "Votre dossier a été refusé. Contactez-nous pour plus d'informations.",
      suspendu: "Votre compte est suspendu. Contactez-nous.",
    };
    return (
      <div className="mx-auto max-w-2xl">
        {entete}
        <p className="carte">{messages[t.statut]}</p>
      </div>
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

  return (
    <div className="space-y-8">
      {entete}

      {!stripePret && (
        <div className="carte border-amber-300 bg-amber-50">
          <p className="font-semibold">Activez vos virements pour être payé après chaque livraison.</p>
          <form action={connecterStripe}>
            <button className="bouton mt-3">Configurer mes virements (Stripe)</button>
          </form>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-xl font-bold">Mes courses en cours</h2>
        {enCours.length === 0 && <p className="text-slate-500">Aucune course en cours.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {enCours.map((c) => (
            <article key={c.id} className="carte space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">#{c.reference}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUTS[c.statut].couleur}`}>{STATUTS[c.statut].libelle}</span>
              </div>
              <p className="text-sm"><strong>Enlèvement</strong> {dateReunion(c.date_enlevement)}<br />{c.adresse_depart}, {nomCommune(c.commune_depart)}{c.etages_depart > 0 && ` (${c.etages_depart}e étage sans ascenseur)`}</p>
              <p className="text-sm"><strong>Livraison</strong><br />{c.adresse_arrivee}, {nomCommune(c.commune_arrivee)}{c.etages_arrivee > 0 && ` (${c.etages_arrivee}e étage sans ascenseur)`}</p>
              <p className="text-sm text-slate-600">{c.description}</p>
              <p className="text-sm">Client : {c.client_nom} — <a className="text-marque underline" href={`tel:${c.client_telephone}`}>{c.client_telephone}</a></p>
              <p className="font-semibold text-marque">Vous recevez {euros(c.remuneration_transporteur_cts)}</p>
              <div className="flex flex-wrap gap-2">
                <a className="bouton-secondaire" target="_blank" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.statut === "acceptee" ? c.adresse_depart : c.adresse_arrivee}, ${nomCommune(c.statut === "acceptee" ? c.commune_depart : c.commune_arrivee)}, La Réunion`)}`}>
                  Itinéraire
                </a>
                {c.statut === "acceptee" && (
                  <form action={marquerEnlevee}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="bouton">Marchandise chargée</button>
                  </form>
                )}
              </div>
              {c.statut === "enlevee" && <FormulaireLivraison id={c.id} />}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Courses disponibles</h2>
        {disponibles.length === 0 && <p className="text-slate-500">Aucune course disponible pour le moment.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {disponibles.map((c) => (
            <article key={c.id} className="carte space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{nomCommune(c.commune_depart)} → {nomCommune(c.commune_arrivee)}</p>
                <p className="text-xl font-bold text-marque">{euros(c.remuneration_transporteur_cts)}</p>
              </div>
              <p className="text-sm text-slate-600">{dateReunion(c.date_enlevement)} · {c.distance_km} km · {VEHICULES[c.vehicule as keyof typeof VEHICULES].nom}</p>
              <p className="text-sm">{c.description}</p>
              <p className="flex gap-2 text-xs">
                {c.express && <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Express</span>}
                {c.aide_manutention && <span className="rounded bg-slate-100 px-2 py-0.5">2 personnes</span>}
              </p>
              <form action={accepterCourse}>
                <input type="hidden" name="id" value={c.id} />
                <button className="bouton w-full" disabled={!stripePret}>Accepter la course</button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Historique</h2>
        <p className="mb-3 text-slate-600">Total gagné : <strong>{euros(gainsCts)}</strong></p>
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {terminees.map((c) => (
            <li key={c.id} className="flex justify-between gap-2 p-3 text-sm">
              <span>#{c.reference} · {nomCommune(c.commune_depart)} → {nomCommune(c.commune_arrivee)}</span>
              <span>{STATUTS[c.statut].libelle} · {euros(c.remuneration_transporteur_cts)}</span>
            </li>
          ))}
          {terminees.length === 0 && <li className="p-3 text-sm text-slate-500">Aucune course terminée.</li>}
        </ul>
      </section>
    </div>
  );
}
