import "server-only";
import nodemailer from "nodemailer";
import { MARQUE } from "./config";

// SMTP de la messagerie Hostinger (ou tout autre fournisseur).
// Sans configuration SMTP, l'e-mail est affiché dans les logs (pratique en local).
export async function envoyerEmail(destinataire: string, sujet: string, texte: string, repondreA?: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    console.log(`[e-mail non envoyé, SMTP absent] À : ${destinataire}\nSujet : ${sujet}\n${texte}`);
    return;
  }
  const port = Number(SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  await transport.sendMail({ from: SMTP_FROM ?? `${MARQUE} <${SMTP_USER}>`, to: destinataire, subject: sujet, text: texte, replyTo: repondreA });
}
