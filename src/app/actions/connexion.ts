"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { cheminSur, connecterAvecCode, connecterAvecJeton, creerLienConnexion, deconnecter } from "@/lib/auth";
import { MARQUE } from "@/lib/config";
import { une } from "@/lib/db";
import { envoyerEmail } from "@/lib/email";
import { urlSite } from "@/lib/stripe";

type Etat = { erreur?: string; ok?: string; email?: string };

export async function envoyerLien(_: Etat, form: FormData): Promise<Etat> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim());
  if (!email.success) return { erreur: "E-mail invalide" };
  const retour = cheminSur(String(form.get("retour") ?? ""), "/compte");

  // Au plus 5 codes par heure et par adresse : empêche de deviner un code à force de redemander.
  const recents = await une<{ n: number }>(
    "select count(*)::int as n from jetons_connexion where email = $1 and expire_le > now() - interval '40 minutes'",
    [email.data.toLowerCase()],
  );
  if ((recents?.n ?? 0) >= 5) return { erreur: "Trop de demandes : réessayez dans une heure." };

  const { jeton, code } = await creerLienConnexion(email.data);
  const lien = `${urlSite()}/connexion/verifier?jeton=${jeton}&retour=${encodeURIComponent(retour)}`;
  try {
    await envoyerEmail(
      email.data,
      `${code} : votre code de connexion ${MARQUE}`,
      `Bonjour,\n\nVotre code de connexion : ${code}\n(à saisir dans l'app ou sur le site, valable 20 minutes)\n\nOu cliquez sur ce lien depuis ce même appareil :\n${lien}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.\n\n${MARQUE}`,
    );
  } catch (e) {
    console.error("envoi lien connexion", e);
    return { erreur: "Envoi impossible, réessayez dans une minute." };
  }
  return { ok: `Code envoyé à ${email.data}.`, email: email.data };
}

export async function validerCode(_: Etat, form: FormData): Promise<Etat> {
  const email = String(form.get("email") ?? "");
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { erreur: "Le code contient 6 chiffres.", email };
  if (!(await connecterAvecCode(email, code))) return { erreur: "Code incorrect ou expiré.", email };
  redirect(cheminSur(String(form.get("retour") ?? "")));
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
