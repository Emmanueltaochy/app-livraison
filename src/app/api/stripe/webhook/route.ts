import type Stripe from "stripe";
import { requete } from "@/lib/db";
import { confirmerPaiement } from "@/lib/paiement";
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

  if (event.type === "checkout.session.completed") await confirmerPaiement(event.data.object);

  if (event.type === "account.updated") {
    const compte = event.data.object;
    await requete("update transporteurs set stripe_pret = $2 where stripe_account_id = $1", [
      compte.id,
      comptePret(compte),
    ]);
  }

  return Response.json({ recu: true });
}
