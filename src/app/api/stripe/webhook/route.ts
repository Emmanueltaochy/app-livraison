import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

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

  const sb = supabaseAdmin();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const commandeId = session.metadata?.commande_id;
    if (commandeId && session.payment_status === "paid") {
      const pi = await stripe().paymentIntents.retrieve(session.payment_intent as string);
      await sb
        .from("commandes")
        .update({
          statut: "payee",
          payee_le: new Date().toISOString(),
          stripe_charge_id: typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id,
        })
        .eq("id", commandeId)
        .eq("statut", "attente_paiement");
    }
  }

  if (event.type === "account.updated") {
    const compte = event.data.object;
    await sb
      .from("transporteurs")
      .update({ stripe_pret: Boolean(compte.charges_enabled && compte.payouts_enabled) })
      .eq("stripe_account_id", compte.id);
  }

  return Response.json({ recu: true });
}
