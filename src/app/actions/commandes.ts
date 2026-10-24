"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { estSurLIle, getCommune, type Point } from "@/lib/communes";
import { decrire, lireInventaire, resumer } from "@/lib/inventaire";
import { calculerDevis, personnesMinimum, vehiculeConseille, vehiculeSuffit, VEHICULES } from "@/lib/pricing";
import { paiementDemo, stripe, stripeConfigure, urlSite } from "@/lib/stripe";
import { utilisateurCourant } from "@/lib/auth";
import { requete, une } from "@/lib/db";
import { MARQUE } from "@/lib/config";
import { notifierNouvelleCourse } from "@/lib/nouvelleCourse";

const coche = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const entier = z.coerce.number().int().min(0).max(30);
const coordonnee = z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().finite().optional());

// Délai de prise en charge d'une commande « Maintenant » (traitée en express).
const DELAI_MAINTENANT_MS = 60 * 60 * 1000;

const schema = z.object({
  commune_depart: z.string().refine((id) => getCommune(id), "Commune de départ inconnue"),
  adresse_depart: z.string().trim().min(5, "Adresse de départ trop courte"),
  commune_arrivee: z.string().refine((id) => getCommune(id), "Commune d'arrivée inconnue"),
  adresse_arrivee: z.string().trim().min(5, "Adresse d'arrivée trop courte"),
  mode: z.enum(["programme", "maintenant"]).default("programme"),
  depart_lat: coordonnee,
  depart_lng: coordonnee,
  arrivee_lat: coordonnee,
  arrivee_lng: coordonnee,
  date_enlevement: z.string().optional(),
  type_transport: z.enum(["objets", "magasin", "demenagement", "materiaux"]),
  inventaire: z.string().transform((v, ctx) => {
    try {
      return lireInventaire(JSON.parse(v));
    } catch {
      ctx.addIssue({ code: "custom", message: "Inventaire invalide" });
      return z.NEVER;
    }
  }),
  precisions: z.string().trim().max(1000).optional(),
  vehicule: z.enum(["petit", "moyen", "grand"]),
  personnes: z.coerce.number().int().min(1).max(3),
  etages_depart: entier,
  etages_arrivee: entier,
  ascenseur_depart: coche,
  ascenseur_arrivee: coche,
  portage_long: coche,
  demontage: coche,
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

  let dateEnlevement: Date;
  if (f.mode === "maintenant") {
    dateEnlevement = new Date(Date.now() + DELAI_MAINTENANT_MS);
    f.express = true;
  } else {
    // Date et heure saisies en heure de La Réunion (UTC+4).
    dateEnlevement = new Date(`${f.date_enlevement}:00+04:00`);
    if (Number.isNaN(dateEnlevement.getTime())) return { erreur: "Date invalide" };
    if (dateEnlevement.getTime() < Date.now() - 15 * 60 * 1000) return { erreur: "La date d'enlèvement est passée" };
  }
  const contenu = resumer(f.inventaire);
  if (contenu.nombre === 0) return { erreur: "Ajoutez au moins un objet à transporter" };
  const conseille = vehiculeConseille(contenu);
  if (!conseille) return { erreur: "Trop volumineux pour un seul voyage : contactez-nous pour un devis sur mesure." };
  if (!vehiculeSuffit(f.vehicule, conseille)) return { erreur: `Il faut au minimum : ${VEHICULES[conseille].nom}` };
  if (f.personnes < personnesMinimum(contenu, f.type_transport)) return { erreur: "Ajoutez une personne : certains objets ne se portent pas seul." };

  const point = (lat?: number, lng?: number): Point | undefined =>
    lat !== undefined && lng !== undefined && estSurLIle({ lat, lng }) ? { lat, lng } : undefined;
  const pointDepart = point(f.depart_lat, f.depart_lng);
  const pointArrivee = point(f.arrivee_lat, f.arrivee_lng);

  // Le prix est recalculé ici : celui affiché dans le navigateur n'est qu'indicatif.
  const devis = calculerDevis({
    depart: f.commune_depart,
    arrivee: f.commune_arrivee,
    vehicule: f.vehicule,
    inventaire: f.inventaire,
    personnes: f.personnes,
    accesDepart: { etage: f.etages_depart, ascenseur: f.ascenseur_depart },
    accesArrivee: { etage: f.etages_arrivee, ascenseur: f.ascenseur_arrivee },
    portageLong: f.portage_long,
    demontage: f.demontage && contenu.demontage > 0,
    assuranceRenforcee: f.assurance_renforcee,
    express: f.express,
    dateEnlevement,
    pointDepart,
    pointArrivee,
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
         distance_km, transport_cts, frais_service_cts, total_cts, commission_cts, remuneration_transporteur_cts,
         mode, depart_lat, depart_lng, arrivee_lat, arrivee_lng,
         type_transport, inventaire, volume_m3, poids_kg, personnes, minutes_manutention,
         ascenseur_depart, ascenseur_arrivee, portage_long, demontage, precisions
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
                 $29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39)
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
        dateEnlevement,
        [decrire(f.inventaire), f.precisions].filter(Boolean).join(" — "),
        f.vehicule,
        f.personnes > 1,
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
        f.mode,
        pointDepart?.lat ?? null,
        pointDepart?.lng ?? null,
        pointArrivee?.lat ?? null,
        pointArrivee?.lng ?? null,
        f.type_transport,
        JSON.stringify(f.inventaire),
        contenu.volume,
        Math.round(contenu.poids),
        f.personnes,
        devis.minutesManutention,
        f.ascenseur_depart,
        f.ascenseur_arrivee,
        f.portage_long,
        f.demontage && contenu.demontage > 0,
        f.precisions || null,
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
    await notifierNouvelleCourse(commande.id);
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
