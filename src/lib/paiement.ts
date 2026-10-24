import "server-only";
import type Stripe from "stripe";
import { requete, une } from "./db";
import { notifierNouvelleCourse } from "./nouvelleCourse";
import { stripe, urlSite } from "./stripe";

// Client Stripe de l'utilisateur (créé à la première commande) : cartes enregistrées.
export async function clientStripe(u: { id: string; email: string; nom: string | null }): Promise<string> {
  const ligne = await une<{ stripe_customer_id: string | null }>("select stripe_customer_id from utilisateurs where id = $1", [u.id]);
  if (ligne?.stripe_customer_id) return ligne.stripe_customer_id;
  const client = await stripe().customers.create({ email: u.email, name: u.nom ?? undefined, metadata: { utilisateur_id: u.id } });
  await requete("update utilisateurs set stripe_customer_id = $2 where id = $1 and stripe_customer_id is null", [u.id, client.id]);
  return client.id;
}

// Paiement confirmé (webhook ou retour de paiement) : la commande passe « payée », une seule fois.
export async function confirmerPaiement(session: Stripe.Checkout.Session): Promise<boolean> {
  const commandeId = session.metadata?.commande_id;
  if (!commandeId || session.payment_status !== "paid") return false;
  const pi = await stripe().paymentIntents.retrieve(session.payment_intent as string);
  const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
  // Stripe et le retour navigateur peuvent arriver ensemble : on ne prévient les transporteurs qu'une fois.
  const payee = await une(
    `update commandes set statut = 'payee', payee_le = now(), stripe_charge_id = $2
     where id = $1 and statut = 'attente_paiement' returning id`,
    [commandeId, charge ?? null],
  );
  if (payee) await notifierNouvelleCourse(commandeId);
  return Boolean(payee);
}

export type CommandeAPayer = {
  id: string;
  reference: string;
  jeton_suivi: string;
  client_id: string | null;
  client_email: string;
  commune_depart: string;
  commune_arrivee: string;
  transport_cts: number;
  frais_service_cts: number;
};

// Session de paiement Stripe. Intégrée à la page (embedded_page) quand la clé publique est configurée,
// sinon page de paiement hébergée par Stripe. Client connecté : ses cartes enregistrées sont proposées.
export async function creerSessionPaiement(c: CommandeAPayer, integree: boolean, nomTrajet: string): Promise<Stripe.Checkout.Session> {
  const site = urlSite();
  const suivi = `${site}/suivi/${c.jeton_suivi}`;
  const u = c.client_id ? await une<{ id: string; email: string; nom: string | null }>("select id, email, nom from utilisateurs where id = $1", [c.client_id]) : null;
  const client = u ? await clientStripe(u) : null;

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    ...(integree ? { ui_mode: "embedded_page" as const, return_url: `${suivi}?session_id={CHECKOUT_SESSION_ID}` } : { success_url: `${suivi}?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${site}/?annule=1` }),
    ...(client
      ? { customer: client, saved_payment_method_options: { payment_method_save: "enabled" as const, allow_redisplay_filters: ["always" as const, "limited" as const, "unspecified" as const] } }
      : { customer_email: c.client_email }),
    locale: "fr",
    line_items: [
      { quantity: 1, price_data: { currency: "eur", unit_amount: c.transport_cts, product_data: { name: `Transport ${c.reference}`, description: nomTrajet } } },
      { quantity: 1, price_data: { currency: "eur", unit_amount: c.frais_service_cts, product_data: { name: "Frais de service" } } },
    ],
    metadata: { commande_id: c.id },
    payment_intent_data: { transfer_group: c.id, metadata: { commande_id: c.id } },
  });
  await requete("update commandes set stripe_session_id = $2 where id = $1", [c.id, session.id]);
  return session;
}
