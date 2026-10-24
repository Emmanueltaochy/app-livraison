import { describe, expect, it } from "vitest";
import { choisirTransporteurs, type Candidat } from "./dispatch";

const maintenant = new Date("2026-10-24T08:00:00Z");
const recent = new Date("2026-10-24T07:58:00Z");
const ancien = new Date("2026-10-24T06:00:00Z");
const saintDenis = { lat: -20.8808, lng: 55.4491 };

const candidats: Candidat[] = [
  { id: "proche-moyen", vehicule: "moyen", en_ligne: true, position: { lat: -20.89, lng: 55.46 }, position_le: recent },
  { id: "loin-grand", vehicule: "grand", en_ligne: true, position: { lat: -21.34, lng: 55.48 }, position_le: recent },
  { id: "proche-petit", vehicule: "petit", en_ligne: true, position: { lat: -20.88, lng: 55.45 }, position_le: recent },
  { id: "hors-ligne", vehicule: "moyen", en_ligne: false, position: { lat: -20.88, lng: 55.45 }, position_le: recent },
  { id: "position-perimee", vehicule: "moyen", en_ligne: true, position: { lat: -20.88, lng: 55.45 }, position_le: ancien },
];

describe("choisirTransporteurs", () => {
  it("maintenant : en ligne, véhicule assez grand, dans le rayon, du plus proche au plus loin", () => {
    const ids = choisirTransporteurs(candidats, { vehicule: "moyen", mode: "maintenant", depart: saintDenis }, maintenant);
    expect(ids).toEqual(["proche-moyen"]);
  });

  it("maintenant : un petit utilitaire ne reçoit pas une course de camion", () => {
    const ids = choisirTransporteurs(candidats, { vehicule: "grand", mode: "maintenant", depart: { lat: -21.33, lng: 55.47 } }, maintenant);
    expect(ids).toEqual(["loin-grand"]);
  });

  it("programmé : tous les véhicules compatibles, les plus proches d'abord", () => {
    const ids = choisirTransporteurs(candidats, { vehicule: "petit", mode: "programme", depart: saintDenis }, maintenant);
    expect(ids).toHaveLength(5); // hors ligne compris : on prévient à l'avance
    expect(ids.indexOf("proche-petit")).toBeLessThan(ids.indexOf("proche-moyen"));
    expect(ids.indexOf("proche-moyen")).toBeLessThan(ids.indexOf("loin-grand"));
    expect(ids.at(-1)).toBe("position-perimee"); // position périmée : classé en dernier
  });
});
