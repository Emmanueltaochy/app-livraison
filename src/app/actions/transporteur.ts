"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { stripe, stripeConfigure, urlSite } from "@/lib/stripe";
import { verserTransporteur } from "@/lib/virements";
import { exigerConnexion, supabaseAdmin } from "@/lib/supabase/server";

export type EtatAction = { erreur?: string; ok?: string };

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
  const { nom, telephone, ...t } = p.data;

  const sb = supabaseAdmin();
  await sb.from("profils").update({ nom, telephone, role: u.profil.role === "admin" ? "admin" : "transporteur" }).eq("id", u.id);
  const { error } = await sb.from("transporteurs").insert({ id: u.id, ...t });
  if (error) return { erreur: "Inscription impossible (déjà inscrit ?)" };
  revalidatePath("/transporteur");
  return { ok: "Dossier envoyé, nous le validons sous 24 h." };
}

async function transporteurValide() {
  const u = await exigerConnexion("/transporteur");
  const { data: t } = await supabaseAdmin().from("transporteurs").select("*").eq("id", u.id).single();
  if (!t || t.statut !== "valide") throw new Error("Compte transporteur non validé");
  return t;
}

export async function connecterStripe() {
  const t = await transporteurValide();
  if (!stripeConfigure()) throw new Error("Stripe non configuré");
  let compteId: string = t.stripe_account_id;
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
    await supabaseAdmin().from("transporteurs").update({ stripe_account_id: compteId }).eq("id", t.id);
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
  const id = String(form.get("id"));
  // Mise à jour conditionnelle : un seul transporteur peut gagner la course.
  await supabaseAdmin()
    .from("commandes")
    .update({ statut: "acceptee", transporteur_id: t.id, acceptee_le: new Date().toISOString() })
    .eq("id", id)
    .eq("statut", "payee")
    .is("transporteur_id", null);
  revalidatePath("/transporteur");
}

export async function marquerEnlevee(form: FormData) {
  const t = await transporteurValide();
  await supabaseAdmin()
    .from("commandes")
    .update({ statut: "enlevee", enlevee_le: new Date().toISOString() })
    .eq("id", String(form.get("id")))
    .eq("transporteur_id", t.id)
    .eq("statut", "acceptee");
  revalidatePath("/transporteur");
}

export async function confirmerLivraison(_: EtatAction, form: FormData): Promise<EtatAction> {
  const t = await transporteurValide();
  const sb = supabaseAdmin();
  const { data: c } = await sb
    .from("commandes")
    .select("*")
    .eq("id", String(form.get("id")))
    .eq("transporteur_id", t.id)
    .eq("statut", "enlevee")
    .single();
  if (!c) return { erreur: "Course introuvable" };
  if (String(form.get("code")).trim() !== c.code_livraison) return { erreur: "Code de livraison incorrect" };

  await sb.from("commandes").update({ statut: "livree", livree_le: new Date().toISOString() }).eq("id", c.id);

  await verserTransporteur(c.id);

  revalidatePath("/transporteur");
  return { ok: "Livraison confirmée" };
}
