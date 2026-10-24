import "server-only";
import { createSign } from "node:crypto";
import { connect } from "node:http2";
import { jwtApns } from "./apns";
import { requete } from "./db";

// Notifications push :
//  - Android : Firebase Cloud Messaging (API HTTP v1).
//    FIREBASE_SERVICE_ACCOUNT = contenu JSON du compte de service (brut ou en base64).
//  - iPhone : directement au service d'Apple (APNs), avec la clé .p8 du compte Apple Developer.
//    APNS_CLE (contenu du .p8, brut ou en base64), APNS_CLE_ID, APNS_EQUIPE_ID, APNS_BUNDLE_ID (re.fretpei.app par défaut).
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
export type Appareil = { jeton: string; plateforme: "android" | "ios" | "web" };

// Envoie le message à chaque appareil ; les jetons expirés sont supprimés.
export async function envoyerPush(appareils: Appareil[], message: Message): Promise<number> {
  const ios = appareils.filter((a) => a.plateforme === "ios").map((a) => a.jeton);
  const autres = appareils.filter((a) => a.plateforme !== "ios").map((a) => a.jeton);
  const [n1, n2] = await Promise.all([envoyerFcm(autres, message), envoyerApns(ios, message)]);
  return n1 + n2;
}

async function oublierJeton(jeton: string) {
  await requete("delete from appareils where jeton = $1", [jeton]);
}

async function envoyerFcm(jetons: string[], message: Message): Promise<number> {
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
          },
        }),
      });
      if (res.ok) envoyes++;
      else if (res.status === 404 || res.status === 400) await oublierJeton(jeton);
      else console.error("FCM", res.status, await res.text());
    }),
  );
  return envoyes;
}

// --- APNs (iPhone) ---

type ConfigApns = { cle: string; cleId: string; equipeId: string; bundleId: string };
let jetonApns: { valeur: string; cree: number } | null = null;

function configApns(): ConfigApns | null {
  const { APNS_CLE, APNS_CLE_ID, APNS_EQUIPE_ID, APNS_BUNDLE_ID } = process.env;
  if (!APNS_CLE || !APNS_CLE_ID || !APNS_EQUIPE_ID) return null;
  const cle = APNS_CLE.includes("BEGIN PRIVATE KEY") ? APNS_CLE.replace(/\\n/g, "\n") : Buffer.from(APNS_CLE, "base64").toString("utf8");
  return { cle, cleId: APNS_CLE_ID, equipeId: APNS_EQUIPE_ID, bundleId: APNS_BUNDLE_ID ?? "re.fretpei.app" };
}

function requeteApns(hote: string, jeton: string, jwt: string, bundleId: string, corps: string): Promise<{ statut: number; raison?: string }> {
  return new Promise((resolve, reject) => {
    const session = connect(`https://${hote}`);
    session.on("error", reject);
    const req = session.request({
      ":method": "POST",
      ":path": `/3/device/${jeton}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });
    let statut = 0;
    let reponse = "";
    req.on("response", (h) => (statut = Number(h[":status"])));
    req.on("data", (d) => (reponse += d));
    req.on("end", () => {
      session.close();
      resolve({ statut, raison: reponse ? (JSON.parse(reponse) as { reason?: string }).reason : undefined });
    });
    req.on("error", reject);
    req.end(corps);
  });
}

async function envoyerApns(jetons: string[], message: Message): Promise<number> {
  const c = configApns();
  if (!c || jetons.length === 0) {
    if (jetons.length) console.log(`[push iPhone non configuré] ${jetons.length} appareil(s) : ${message.titre} — ${message.corps}`);
    return 0;
  }
  if (!jetonApns || Date.now() - jetonApns.cree > 50 * 60 * 1000) jetonApns = { valeur: jwtApns(c), cree: Date.now() };
  const corps = JSON.stringify({ aps: { alert: { title: message.titre, body: message.corps }, sound: "default" }, lien: message.lien });
  let envoyes = 0;
  await Promise.all(
    jetons.map(async (jeton) => {
      try {
        // App publiée (TestFlight / App Store) → production ; app lancée depuis Xcode → bac à sable.
        let r = await requeteApns("api.push.apple.com", jeton, jetonApns!.valeur, c.bundleId, corps);
        if (r.statut === 400 && r.raison === "BadDeviceToken") r = await requeteApns("api.sandbox.push.apple.com", jeton, jetonApns!.valeur, c.bundleId, corps);
        if (r.statut === 200) envoyes++;
        else if (r.statut === 410 || r.raison === "BadDeviceToken" || r.raison === "Unregistered") await oublierJeton(jeton);
        else console.error("APNs", r.statut, r.raison);
      } catch (e) {
        console.error("APNs", e);
      }
    }),
  );
  return envoyes;
}
