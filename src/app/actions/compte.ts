"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerConnexion } from "@/lib/auth";
import { requete, une } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export type EtatProfil = { erreur?: string; ok?: string };

const profil = z.object({
  nom: z.string().trim().min(2, "Nom requis").max(120),
  telephone: z.string().trim().regex(/^(\+?262|\+?33|0)[0-9 .]{8,13}$/, "Téléphone invalide"),
});

export async function mettreAJourProfil(_: EtatProfil, form: FormData): Promise<EtatProfil> {
  const u = await exigerConnexion("/compte/profil");
  const p = profil.safeParse(Object.fromEntries(form));
  if (!p.success) return { erreur: p.error.issues[0]?.message };
  await requete("update utilisateurs set nom = $2, telephone = $3 where id = $1", [u.id, p.data.nom, p.data.telephone]);
  revalidatePath("/compte", "layout");
  return { ok: "Profil enregistré" };
}

// Retire une carte enregistrée, après avoir vérifié qu'elle appartient bien à ce client.
export async function supprimerCarte(form: FormData) {
  const u = await exigerConnexion("/compte/cartes");
  const ligne = await une<{ stripe_customer_id: string | null }>("select stripe_customer_id from utilisateurs where id = $1", [u.id]);
  const pm = await stripe().paymentMethods.retrieve(String(form.get("id")));
  if (ligne?.stripe_customer_id && pm.customer === ligne.stripe_customer_id) await stripe().paymentMethods.detach(pm.id);
  revalidatePath("/compte/cartes");
}
