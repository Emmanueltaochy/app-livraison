import "server-only";
import { createHash, randomBytes } from "node:crypto";
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

export async function creerLienConnexion(email: string): Promise<string> {
  const jeton = nouveauJeton();
  await requete("insert into jetons_connexion (empreinte, email, expire_le) values ($1, $2, $3)", [
    empreinte(jeton),
    email.toLowerCase(),
    new Date(Date.now() + DUREE_LIEN_MS),
  ]);
  return jeton;
}

// Consomme le jeton (une seule fois), crée le compte au besoin et ouvre la session.
export async function connecterAvecJeton(jeton: string): Promise<boolean> {
  const lien = await une<{ email: string }>(
    `update jetons_connexion set utilise_le = now()
     where empreinte = $1 and utilise_le is null and expire_le > now()
     returning email`,
    [empreinte(jeton)],
  );
  if (!lien) return false;

  const u = await une<{ id: string }>(
    `insert into utilisateurs (email) values ($1)
     on conflict (email) do update set email = excluded.email
     returning id`,
    [lien.email],
  );
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
