import "server-only";
import { createSign } from "node:crypto";
import { requete } from "./db";

// Notifications push via Firebase Cloud Messaging (API HTTP v1), Android et iOS.
// Configuration : FIREBASE_SERVICE_ACCOUNT = contenu JSON du compte de service (brut ou en base64).
// Sans configuration, les notifications sont simplement ignorées (journalisées).

type CompteService = { project_id: string; client_email: string; private_key: string };

let compte: CompteService | null | undefined;
let jetonAcces: { valeur: string; expire: number } | null = null;

function compteService(): CompteService | null {
  if (compte !== undefined) return compte;
  const brut = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!brut) return (compte = null);
  const json = brut.startsWith("{") ? brut : Buffer.from(brut, "base64").toString("utf8");
  return (compte = JSON.parse(json) as CompteService);
}

export function notificationsConfigurees(): boolean {
  return compteService() !== null;
}

const base64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

// Jeton OAuth2 obtenu en signant un JWT avec la clé du compte de service (valable 1 h).
async function accesGoogle(c: CompteService): Promise<string> {
  if (jetonAcces && jetonAcces.expire > Date.now() + 60_000) return jetonAcces.valeur;
  const maintenant = Math.floor(Date.now() / 1000);
  const entete = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const charge = base64url(
    JSON.stringify({
      iss: c.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: maintenant,
      exp: maintenant + 3600,
    }),
  );
  const signature = createSign("RSA-SHA256").update(`${entete}.${charge}`).sign(c.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${entete}.${charge}.${signature}` }),
  });
  if (!res.ok) throw new Error(`OAuth Google : ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  jetonAcces = { valeur: json.access_token, expire: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

export type Message = { titre: string; corps: string; lien: string };

// Envoie le message à chaque appareil ; les jetons expirés sont supprimés.
export async function envoyerPush(jetons: string[], message: Message): Promise<number> {
  const c = compteService();
  if (!c || jetons.length === 0) {
    if (jetons.length) console.log(`[push non configuré] ${jetons.length} appareil(s) : ${message.titre} — ${message.corps}`);
    return 0;
  }
  const acces = await accesGoogle(c);
  let envoyes = 0;
  await Promise.all(
    jetons.map(async (jeton) => {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${c.project_id}/messages:send`, {
        method: "POST",
        headers: { authorization: `Bearer ${acces}`, "content-type": "application/json" },
        body: JSON.stringify({
          message: {
            token: jeton,
            notification: { title: message.titre, body: message.corps },
            data: { lien: message.lien },
            android: { priority: "high", notification: { channel_id: "courses", sound: "default" } },
            apns: { payload: { aps: { sound: "default" } } },
          },
        }),
      });
      if (res.ok) envoyes++;
      else if (res.status === 404 || res.status === 400) await requete("delete from appareils where jeton = $1", [jeton]);
      else console.error("FCM", res.status, await res.text());
    }),
  );
  return envoyes;
}
