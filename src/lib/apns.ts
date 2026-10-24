import { createSign } from "node:crypto";

// Jeton d'authentification Apple Push (JWT ES256), signé avec la clé .p8 du compte Apple Developer.
// Apple le refuse au-delà d'une heure : l'appelant le régénère toutes les 50 min.
export function jwtApns(c: { cle: string; cleId: string; equipeId: string }, maintenant = Date.now()): string {
  const base64url = (s: string) => Buffer.from(s).toString("base64url");
  const entete = base64url(JSON.stringify({ alg: "ES256", kid: c.cleId }));
  const charge = base64url(JSON.stringify({ iss: c.equipeId, iat: Math.floor(maintenant / 1000) }));
  const signature = createSign("SHA256").update(`${entete}.${charge}`).sign({ key: c.cle, dsaEncoding: "ieee-p1363" }, "base64url");
  return `${entete}.${charge}.${signature}`;
}
