import type Stripe from "stripe";
import { requete, une } from "@/lib/db";
import { notifierNouvelleCourse } from "@/lib/nouvelleCourse";
import { stripe, comptePret } from "@/lib/stripe";

// Stripe → nous : confirmation de paiement et mise à jour des comptes transporteurs.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook non configuré", { status: 500 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const commandeId = session.metadata?.commande_id;
    if (commandeId && session.payment_status === "paid") {
      const pi = await stripe().paymentIntents.retrieve(session.payment_intent as string);
      const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
      // Stripe peut renvoyer le même événement : on ne prévient les transporteurs qu'une fois.
      const payee = await une(
        `update commandes set statut = 'payee', payee_le = now(), stripe_charge_id = $2
         where id = $1 and statut = 'attente_paiement' returning id`,
        [commandeId, charge ?? null],
      );
      if (payee) await notifierNouvelleCourse(commandeId);
    }
  }

  if (event.type === "account.updated") {
    const compte = event.data.object;
    await requete("update transporteurs set stripe_pret = $2 where stripe_account_id = $1", [
      compte.id,
      comptePret(compte),
    ]);
  }

  return Response.json({ recu: true });
}
