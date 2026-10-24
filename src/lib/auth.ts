import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requete, une } from "./db";

// Connexion sans mot de passe : lien à usage unique envoyé par e-mail, puis cookie de session.
// En base on ne garde que l'empreinte des jetons : une fuite de la base ne permet pas de se connecter.

const COOKIE = "session";
const DUREE_LIEN_MS = 20 * 60 * 1000;
const DUREE_SESSION_MS = 60 * 24 * 3600 * 1000;

export type Utilisateur = {
  id: string;
  email: string;
  role: "client" | "transporteur" | "admin";
  nom: string | null;
  telephone: string | null;
};

const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");
const nouveauJeton = () => randomBytes(32).toString("base64url");

const MAX_TENTATIVES_CODE = 5;
const empreinteCode = (email: string, code: string) => empreinte(`${email.toLowerCase()}:${code}`);

// Crée un lien (pour le navigateur) et un code à 6 chiffres (pour l'app), utilisables une seule fois.
export async function creerLienConnexion(email: string): Promise<{ jeton: string; code: string }> {
  const jeton = nouveauJeton();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await requete("insert into jetons_connexion (empreinte, email, expire_le, code_empreinte) values ($1, $2, $3, $4)", [
    empreinte(jeton),
    email.toLowerCase(),
    new Date(Date.now() + DUREE_LIEN_MS),
    empreinteCode(email, code),
  ]);
  return { jeton, code };
}

// Consomme le jeton (une seule fois), crée le compte au besoin et ouvre la session.
export async function connecterAvecJeton(jeton: string): Promise<boolean> {
  const lien = await une<{ email: string }>(
    `update jetons_connexion set utilise_le = now()
     where empreinte = $1 and utilise_le is null and expire_le > now()
     returning email`,
    [empreinte(jeton)],
  );
  return lien ? ouvrirSession(lien.email) : false;
}

// Vérifie le code du dernier envoi pour cet e-mail ; 5 essais au plus, puis il faut redemander un code.
export async function connecterAvecCode(email: string, code: string): Promise<boolean> {
  const essai = await une<{ valide: boolean }>(
    `update jetons_connexion set tentatives = tentatives + 1,
       utilise_le = case when code_empreinte = $2 then now() else utilise_le end
     where empreinte = (
       select empreinte from jetons_connexion
       where email = $1 and utilise_le is null and expire_le > now() and tentatives < $3
       order by expire_le desc limit 1
     )
     returning code_empreinte = $2 as valide`,
    [email.toLowerCase(), empreinteCode(email, code), MAX_TENTATIVES_CODE],
  );
  return essai?.valide ? ouvrirSession(email.toLowerCase()) : false;
}

async function ouvrirSession(email: string): Promise<boolean> {
  const u = await une<{ id: string }>(
    `insert into utilisateurs (email) values ($1)
     on conflict (email) do update set email = excluded.email
     returning id`,
    [email],
  );
  // Les commandes passées sans compte avec cette adresse rejoignent l'espace client.
  await requete("update commandes set client_id = $1 where client_id is null and lower(client_email) = $2", [u!.id, email]);
  const session = nouveauJeton();
  const expire = new Date(Date.now() + DUREE_SESSION_MS);
  await requete("insert into sessions (empreinte, utilisateur_id, expire_le) values ($1, $2, $3)", [
    empreinte(session),
    u!.id,
    expire,
  ]);
  (await cookies()).set(COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expire,
  });
  return true;
}

export async function deconnecter() {
  const store = await cookies();
  const jeton = store.get(COOKIE)?.value;
  if (jeton) await requete("delete from sessions where empreinte = $1", [empreinte(jeton)]);
  store.delete(COOKIE);
}

export async function utilisateurCourant(): Promise<Utilisateur | null> {
  const jeton = (await cookies()).get(COOKIE)?.value;
  if (!jeton) return null;
  return une<Utilisateur>(
    `select u.id, u.email, u.role, u.nom, u.telephone
     from sessions s join utilisateurs u on u.id = s.utilisateur_id
     where s.empreinte = $1 and s.expire_le > now()`,
    [empreinte(jeton)],
  );
}

export async function exigerConnexion(retour: string): Promise<Utilisateur> {
  const u = await utilisateurCourant();
  if (!u) redirect(`/connexion?retour=${encodeURIComponent(retour)}`);
  return u;
}

export async function exigerAdmin(): Promise<Utilisateur> {
  const u = await exigerConnexion("/admin");
  if (u.role !== "admin") redirect("/");
  return u;
}

// N'accepte que des chemins internes (évite les redirections vers un site tiers).
export function cheminSur(retour: string | null | undefined, defaut = "/"): string {
  return retour && retour.startsWith("/") && !retour.startsWith("//") && !retour.startsWith("/\\") ? retour : defaut;
}
