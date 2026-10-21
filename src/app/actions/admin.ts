"use server";

import { revalidatePath } from "next/cache";
import { exigerAdmin, supabaseAdmin } from "@/lib/supabase/server";
import { verserTransporteur } from "@/lib/virements";

export async function changerStatutTransporteur(form: FormData) {
  await exigerAdmin();
  const statut = String(form.get("statut"));
  if (!["valide", "refuse", "suspendu"].includes(statut)) return;
  await supabaseAdmin().from("transporteurs").update({ statut }).eq("id", String(form.get("id")));
  revalidatePath("/admin");
}

export async function annulerCommande(form: FormData) {
  await exigerAdmin();
  // Le remboursement se fait depuis le tableau de bord Stripe pour garder un contrôle humain.
  await supabaseAdmin()
    .from("commandes")
    .update({ statut: "annulee" })
    .eq("id", String(form.get("id")))
    .in("statut", ["attente_paiement", "payee", "acceptee"]);
  revalidatePath("/admin");
}

export async function relancerVirement(form: FormData) {
  await exigerAdmin();
  await verserTransporteur(String(form.get("id")));
  revalidatePath("/admin");
}
