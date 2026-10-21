"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCommune } from "@/lib/communes";
import { calculerDevis } from "@/lib/pricing";
import { paiementDemo, stripe, stripeConfigure, urlSite } from "@/lib/stripe";
import { utilisateurCourant } from "@/lib/auth";
import { requete, une } from "@/lib/db";
import { MARQUE } from "@/lib/config";

const coche = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const entier = z.coerce.number().int().min(0).max(30);

const schema = z.object({
  commune_depart: z.string().refine((id) => getCommune(id), "Commune de départ inconnue"),
  adresse_depart: z.string().trim().min(5, "Adresse de départ trop courte"),
  commune_arrivee: z.string().refine((id) => getCommune(id), "Commune d'arrivée inconnue"),
  adresse_arrivee: z.string().trim().min(5, "Adresse d'arrivée trop courte"),
  date_enlevement: z.string().transform((s, ctx) => {
    // Le champ datetime-local est saisi en heure de La Réunion (UTC+4).
    const d = new Date(`${s}:00+04:00`);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Date invalide" });
      return z.NEVER;
    }
    if (d.getTime() < Date.now() - 15 * 60 * 1000) {
      ctx.addIssue({ code: "custom", message: "La date d'enlèvement est passée" });
      return z.NEVER;
    }
    return d;
  }),
  description: z.string().trim().min(3, "Décrivez la marchandise").max(1000),
  vehicule: z.enum(["petit", "moyen", "grand"]),
  aide_manutention: coche,
  etages_depart: entier,
  etages_arrivee: entier,
  assurance_renforcee: coche,
  express: coche,
  client_nom: z.string().trim().min(2, "Nom requis"),
  client_telephone: z.string().trim().regex(/^(\+?262|\+?33|0)[0-9 .]{8,13}$/, "Téléphone invalide"),
  client_email: z.email("E-mail invalide"),
});

export type EtatFormulaire = { erreur?: string };

export async function creerCommande(_: EtatFormulaire, form: FormData): Promise<EtatFormulaire> {
  const parse = schema.safeParse(Object.fromEntries(form));
  if (!parse.success) return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide" };
  const f = parse.data;

  // Le prix est recalculé ici : celui affiché dans le navigateur n'est qu'indicatif.
  const devis = calculerDevis({
    depart: f.commune_depart,
    arrivee: f.commune_arrivee,
    vehicule: f.vehicule,
    aideManutention: f.aide_manutention,
    etagesDepart: f.etages_depart,
    etagesArrivee: f.etages_arrivee,
    assuranceRenforcee: f.assurance_renforcee,
    express: f.express,
    dateEnlevement: f.date_enlevement,
  });

  const utilisateur = await utilisateurCourant().catch(() => null);
  const comptePro = utilisateur
    ? await une<{ id: string }>("select id from comptes_pro where proprietaire = $1 limit 1", [utilisateur.id])
    : null;

  let commande: { id: string; reference: string; jeton_suivi: string } | null;
  try {
    commande = await une(
      `insert into commandes (
         client_id, compte_pro_id, client_nom, client_telephone, client_email,
         commune_depart, adresse_depart, commune_arrivee, adresse_arrivee, date_enlevement, description,
         vehicule, aide_manutention, etages_depart, etages_arrivee, assurance_renforcee, express,
         distance_km, transport_cts, frais_service_cts, total_cts, commission_cts, remuneration_transporteur_cts
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       returning id, reference, jeton_suivi`,
      [
        utilisateur?.id ?? null,
        comptePro?.id ?? null,
        f.client_nom,
        f.client_telephone,
        f.client_email,
        f.commune_depart,
        f.adresse_depart,
        f.commune_arrivee,
        f.adresse_arrivee,
        f.date_enlevement,
        f.description,
        f.vehicule,
        f.aide_manutention,
        f.etages_depart,
        f.etages_arrivee,
        f.assurance_renforcee,
        f.express,
        devis.distanceKm,
        devis.transportCts,
        devis.fraisServiceCts,
        devis.totalCts,
        devis.commissionCts,
        devis.remunerationTransporteurCts,
      ],
    );
  } catch (e) {
    console.error("creerCommande", e);
    commande = null;
  }
  if (!commande) return { erreur: "Impossible d'enregistrer la commande, réessayez." };

  const suivi = `${urlSite()}/suivi/${commande.jeton_suivi}`;

  if (!stripeConfigure()) {
    if (!paiementDemo()) return { erreur: "Le paiement en ligne n'est pas encore configuré." };
    await requete("update commandes set statut = 'payee', payee_le = now() where id = $1", [commande.id]);
    redirect(`/suivi/${commande.jeton_suivi}?paye=1`);
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: f.client_email,
    locale: "fr",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: devis.transportCts,
          product_data: {
            name: `Transport ${commande.reference}`,
            description: devis.lignes.slice(0, -1).map((l) => l.libelle).join(" · "),
          },
        },
      },
      {
        quantity: 1,
        price_data: { currency: "eur", unit_amount: devis.fraisServiceCts, product_data: { name: "Frais de service" } },
      },
    ],
    metadata: { commande_id: commande.id },
    payment_intent_data: { transfer_group: commande.id, metadata: { commande_id: commande.id } },
    success_url: `${suivi}?paye=1`,
    cancel_url: `${urlSite()}/?annule=1`,
    custom_text: { submit: { message: `Commande ${commande.reference} — ${MARQUE}` } },
  });

  await requete("update commandes set stripe_session_id = $2 where id = $1", [commande.id, session.id]);
  redirect(session.url!);
}
