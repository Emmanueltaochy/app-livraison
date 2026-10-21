"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { urlSite } from "@/lib/stripe";
import { supabaseSession } from "@/lib/supabase/server";

type Etat = { erreur?: string; ok?: string };

export async function envoyerLien(_: Etat, form: FormData): Promise<Etat> {
  const email = z.email().safeParse(form.get("email"));
  if (!email.success) return { erreur: "E-mail invalide" };
  const retour = String(form.get("retour") ?? "/transporteur");
  const sb = await supabaseSession();
  const { error } = await sb.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${urlSite()}/auth/callback?retour=${encodeURIComponent(retour.startsWith("/") ? retour : "/")}` },
  });
  if (error) return { erreur: "Envoi impossible, réessayez dans une minute." };
  return { ok: `Lien envoyé à ${email.data}. Ouvrez votre boîte mail.` };
}

export async function deconnexion() {
  const sb = await supabaseSession();
  await sb.auth.signOut();
  redirect("/");
}
