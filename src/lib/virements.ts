import "server-only";
import { requete, une } from "./db";
import { stripe, stripeConfigure } from "./stripe";

// Verse sa rémunération au transporteur d'une commande livrée.
// Idempotent : rappelable sans risque (clé d'idempotence + stripe_transfer_id).
export async function verserTransporteur(commandeId: string): Promise<{ ok: boolean; raison?: string }> {
  if (!stripeConfigure()) return { ok: false, raison: "Stripe non configuré" };
  const c = await une<{
    id: string;
    statut: string;
    stripe_charge_id: string | null;
    stripe_transfer_id: string | null;
    remuneration_transporteur_cts: number;
    stripe_account_id: string | null;
    stripe_pret: boolean | null;
  }>(
    `select c.id, c.statut, c.stripe_charge_id, c.stripe_transfer_id, c.remuneration_transporteur_cts,
            t.stripe_account_id, t.stripe_pret
     from commandes c left join transporteurs t on t.id = c.transporteur_id
     where c.id = $1`,
    [commandeId],
  );
  if (!c || c.statut !== "livree") return { ok: false, raison: "Commande non livrée" };
  if (c.stripe_transfer_id) return { ok: true };
  if (!c.stripe_account_id || !c.stripe_pret) return { ok: false, raison: "Compte Stripe du transporteur incomplet" };
  if (!c.stripe_charge_id) return { ok: false, raison: "Paiement client introuvable" };

  try {
    const virement = await stripe().transfers.create(
      {
        amount: c.remuneration_transporteur_cts,
        currency: "eur",
        destination: c.stripe_account_id,
        source_transaction: c.stripe_charge_id,
        transfer_group: c.id,
      },
      { idempotencyKey: `virement-${c.id}` },
    );
    await requete("update commandes set stripe_transfer_id = $2 where id = $1", [c.id, virement.id]);
    return { ok: true };
  } catch (e) {
    console.error("virement transporteur", c.id, e);
    return { ok: false, raison: "Erreur Stripe" };
  }
}
