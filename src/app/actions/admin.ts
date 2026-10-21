"use server";

import { revalidatePath } from "next/cache";
import { exigerAdmin } from "@/lib/auth";
import { requete } from "@/lib/db";
import { verserTransporteur } from "@/lib/virements";

export async function changerStatutTransporteur(form: FormData) {
  await exigerAdmin();
  const statut = String(form.get("statut"));
  if (!["valide", "refuse", "suspendu"].includes(statut)) return;
  await requete("update transporteurs set statut = $2 where id = $1", [String(form.get("id")), statut]);
  revalidatePath("/admin");
}

export async function annulerCommande(form: FormData) {
  await exigerAdmin();
  // Le remboursement se fait depuis le tableau de bord Stripe pour garder un contrôle humain.
  await requete(
    `update commandes set statut = 'annulee'
     where id = $1 and statut in ('attente_paiement', 'payee', 'acceptee')`,
    [String(form.get("id"))],
  );
  revalidatePath("/admin");
}

export async function relancerVirement(form: FormData) {
  await exigerAdmin();
  await verserTransporteur(String(form.get("id")));
  revalidatePath("/admin");
}
