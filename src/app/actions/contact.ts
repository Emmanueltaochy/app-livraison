"use server";

import { z } from "zod";
import { envoyerEmail } from "@/lib/email";

export type EtatContact = { erreur?: string; ok?: boolean };

const schema = z.object({
  nom: z.string().trim().min(2, "Indiquez votre nom").max(120),
  email: z.email("E-mail invalide"),
  telephone: z.string().trim().max(30).optional(),
  sujet: z.enum(["question", "commande", "compte-pro", "transporteur", "autre"]),
  message: z.string().trim().min(10, "Votre message est un peu court").max(4000),
  site: z.string().max(0).optional(), // champ piège invisible : rempli seulement par les robots
});

const SUJETS: Record<string, string> = {
  question: "Question",
  commande: "Une commande",
  "compte-pro": "Compte professionnel",
  transporteur: "Devenir transporteur",
  autre: "Autre",
};

export async function envoyerContact(_: EtatContact, form: FormData): Promise<EtatContact> {
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { erreur: p.error.issues[0]?.message };
  const f = p.data;
  const destinataire = process.env.CONTACT_EMAIL ?? process.env.SMTP_USER;
  if (!destinataire) return { erreur: "Formulaire indisponible pour le moment : écrivez-nous par e-mail." };
  await envoyerEmail(
    destinataire,
    `[Contact] ${SUJETS[f.sujet]} — ${f.nom}`,
    `${f.message}\n\n— ${f.nom}\n${f.email}${f.telephone ? `\n${f.telephone}` : ""}`,
    f.email,
  );
  return { ok: true };
}
