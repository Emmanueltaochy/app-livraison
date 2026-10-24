import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { jwtApns } from "./apns";

describe("jwtApns", () => {
  it("produit un JWT ES256 vérifiable avec la clé publique (format exigé par Apple)", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const cle = privateKey.export({ type: "pkcs8", format: "pem" }).toString(); // même format qu'un .p8
    const jwt = jwtApns({ cle, cleId: "ABC123DEFG", equipeId: "EQUIPE1234" }, Date.UTC(2026, 9, 24));

    const [entete, charge, signature] = jwt.split(".");
    expect(JSON.parse(Buffer.from(entete, "base64url").toString())).toEqual({ alg: "ES256", kid: "ABC123DEFG" });
    expect(JSON.parse(Buffer.from(charge, "base64url").toString())).toEqual({ iss: "EQUIPE1234", iat: 1792800000 });
    expect(Buffer.from(signature, "base64url")).toHaveLength(64); // r||s, et non DER
    const valide = createVerify("SHA256").update(`${entete}.${charge}`).verify({ key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url"));
    expect(valide).toBe(true);
  });
});
