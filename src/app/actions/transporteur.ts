"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigerConnexion } from "@/lib/auth";
import { requete, transaction, une } from "@/lib/db";
import { stripe, stripeConfigure, urlSite } from "@/lib/stripe";
import { verserTransporteur } from "@/lib/virements";

export type EtatAction = { erreur?: string; ok?: string };

export type Transporteur = {
  id: string;
  statut: "en_attente" | "valide" | "refuse" | "suspendu";
  raison_sociale: string;
  vehicule: "petit" | "moyen" | "grand";
  immatriculation: string;
  stripe_account_id: string | null;
  stripe_pret: boolean;
};

const inscription = z.object({
  nom: z.string().trim().min(2, "Nom requis"),
  telephone: z.string().trim().min(10, "Téléphone requis"),
  raison_sociale: z.string().trim().min(2, "Raison sociale requise"),
  siret: z
    .string()
    .transform((s) => s.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{14}$/, "SIRET : 14 chiffres")),
  numero_registre_transport: z.string().trim().min(4, "N° d'inscription au registre des transporteurs requis"),
  assurance_marchandises: z.string().trim().min(4, "Assurance marchandises transportées requise"),
  vehicule: z.enum(["petit", "moyen", "grand"]),
  immatriculation: z.string().trim().min(5, "Immatriculation requise"),
});

export async function inscrireTransporteur(_: EtatAction, form: FormData): Promise<EtatAction> {
  const u = await exigerConnexion("/transporteur");
  const p = inscription.safeParse(Object.fromEntries(form));
  if (!p.success) return { erreur: p.error.issues[0]?.message };
  const t = p.data;

  try {
    await transaction(async (c) => {
      await c.query(
        `update utilisateurs set nom = $2, telephone = $3,
           role = case when role = 'admin' then role else 'transporteur' end
         where id = $1`,
        [u.id, t.nom, t.telephone],
      );
      await c.query(
        `insert into transporteurs (id, raison_sociale, siret, numero_registre_transport, assurance_marchandises, vehicule, immatriculation)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [u.id, t.raison_sociale, t.siret, t.numero_registre_transport, t.assurance_marchandises, t.vehicule, t.immatriculation],
      );
    });
  } catch {
    return { erreur: "Inscription impossible (déjà inscrit ?)" };
  }
  revalidatePath("/transporteur");
  return { ok: "Dossier envoyé, nous le validons sous 24 h." };
}

async function transporteurValide(): Promise<Transporteur> {
  const u = await exigerConnexion("/transporteur");
  const t = await une<Transporteur>("select * from transporteurs where id = $1", [u.id]);
  if (!t || t.statut !== "valide") throw new Error("Compte transporteur non validé");
  return t;
}

export async function connecterStripe() {
  const t = await transporteurValide();
  if (!stripeConfigure()) throw new Error("Stripe non configuré");
  let compteId = t.stripe_account_id;
  if (!compteId) {
    const compte = await stripe().accounts.create({
      type: "express",
      country: "FR",
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
      business_profile: { mcc: "4214", product_description: "Transport de marchandises" },
      metadata: { transporteur_id: t.id },
    });
    compteId = compte.id;
    await requete("update transporteurs set stripe_account_id = $2 where id = $1", [t.id, compteId]);
  }
  const lien = await stripe().accountLinks.create({
    account: compteId,
    type: "account_onboarding",
    refresh_url: `${urlSite()}/transporteur`,
    return_url: `${urlSite()}/transporteur`,
  });
  redirect(lien.url);
}

export async function accepterCourse(form: FormData) {
  const t = await transporteurValide();
  // Mise à jour conditionnelle : un seul transporteur peut gagner la course.
  await requete(
    `update commandes set statut = 'acceptee', transporteur_id = $2, acceptee_le = now()
     where id = $1 and statut = 'payee' and transporteur_id is null`,
    [String(form.get("id")), t.id],
  );
  revalidatePath("/transporteur");
}

export async function marquerEnlevee(form: FormData) {
  const t = await transporteurValide();
  await requete(
    `update commandes set statut = 'enlevee', enlevee_le = now()
     where id = $1 and transporteur_id = $2 and statut = 'acceptee'`,
    [String(form.get("id")), t.id],
  );
  revalidatePath("/transporteur");
}

export async function confirmerLivraison(_: EtatAction, form: FormData): Promise<EtatAction> {
  const t = await transporteurValide();
  const livree = await une<{ id: string }>(
    `update commandes set statut = 'livree', livree_le = now()
     where id = $1 and transporteur_id = $2 and statut = 'enlevee' and code_livraison = $3
     returning id`,
    [String(form.get("id")), t.id, String(form.get("code") ?? "").trim()],
  );
  if (!livree) return { erreur: "Code de livraison incorrect" };

  await verserTransporteur(livree.id);
  revalidatePath("/transporteur");
  return { ok: "Livraison confirmée" };
}
