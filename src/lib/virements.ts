import "server-only";
import { stripe, stripeConfigure } from "./stripe";
import { supabaseAdmin } from "./supabase/server";

// Verse sa rémunération au transporteur d'une commande livrée.
// Idempotent : rappelable sans risque (clé d'idempotence + stripe_transfer_id).
export async function verserTransporteur(commandeId: string): Promise<{ ok: boolean; raison?: string }> {
  if (!stripeConfigure()) return { ok: false, raison: "Stripe non configuré" };
  const sb = supabaseAdmin();
  const { data: c } = await sb
    .from("commandes")
    .select("id, statut, stripe_charge_id, stripe_transfer_id, remuneration_transporteur_cts, transporteurs(stripe_account_id, stripe_pret)")
    .eq("id", commandeId)
    .single();
  if (!c || c.statut !== "livree") return { ok: false, raison: "Commande non livrée" };
  if (c.stripe_transfer_id) return { ok: true };
  const t = c.transporteurs as unknown as { stripe_account_id: string | null; stripe_pret: boolean } | null;
  if (!t?.stripe_account_id || !t.stripe_pret) return { ok: false, raison: "Compte Stripe du transporteur incomplet" };
  if (!c.stripe_charge_id) return { ok: false, raison: "Paiement client introuvable" };

  try {
    const virement = await stripe().transfers.create(
      {
        amount: c.remuneration_transporteur_cts,
        currency: "eur",
        destination: t.stripe_account_id,
        source_transaction: c.stripe_charge_id,
        transfer_group: c.id,
      },
      { idempotencyKey: `virement-${c.id}` },
    );
    await sb.from("commandes").update({ stripe_transfer_id: virement.id }).eq("id", c.id);
    return { ok: true };
  } catch (e) {
    console.error("virement transporteur", c.id, e);
    return { ok: false, raison: "Erreur Stripe" };
  }
}
