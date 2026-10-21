"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { cheminSur, connecterAvecJeton, creerLienConnexion, deconnecter } from "@/lib/auth";
import { MARQUE } from "@/lib/config";
import { envoyerEmail } from "@/lib/email";
import { urlSite } from "@/lib/stripe";

type Etat = { erreur?: string; ok?: string };

export async function envoyerLien(_: Etat, form: FormData): Promise<Etat> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim());
  if (!email.success) return { erreur: "E-mail invalide" };
  const retour = cheminSur(String(form.get("retour") ?? ""), "/transporteur");

  const jeton = await creerLienConnexion(email.data);
  const lien = `${urlSite()}/connexion/verifier?jeton=${jeton}&retour=${encodeURIComponent(retour)}`;
  try {
    await envoyerEmail(
      email.data,
      `Votre lien de connexion ${MARQUE}`,
      `Bonjour,\n\nCliquez sur ce lien pour vous connecter (valable 20 minutes) :\n${lien}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.\n\n${MARQUE}`,
    );
  } catch (e) {
    console.error("envoi lien connexion", e);
    return { erreur: "Envoi impossible, réessayez dans une minute." };
  }
  return { ok: `Lien envoyé à ${email.data}. Ouvrez votre boîte mail.` };
}

export async function validerConnexion(form: FormData) {
  const ok = await connecterAvecJeton(String(form.get("jeton") ?? ""));
  if (!ok) redirect("/connexion?erreur=1");
  redirect(cheminSur(String(form.get("retour") ?? "")));
}

export async function deconnexion() {
  await deconnecter();
  redirect("/");
}
