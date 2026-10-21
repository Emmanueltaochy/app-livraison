import { describe, expect, it } from "vitest";
import { calculerDevis, distanceRouteKm, estHeurePointe } from "./pricing";

describe("distanceRouteKm", () => {
  it("Saint-Denis → Saint-Pierre ≈ 70 km par la route", () => {
    const km = distanceRouteKm("saint-denis", "saint-pierre");
    expect(km).toBeGreaterThan(60);
    expect(km).toBeLessThan(80);
  });

  it("forfait intra-commune", () => {
    expect(distanceRouteKm("le-port", "le-port")).toBe(5);
  });

  it("ajoute le détour des cirques", () => {
    expect(distanceRouteKm("saint-louis", "cilaos")).toBeGreaterThan(30);
  });

  it("refuse une commune inconnue", () => {
    expect(() => distanceRouteKm("paris", "saint-denis")).toThrow();
  });
});

describe("estHeurePointe", () => {
  it("mardi 7h30 heure Réunion = pointe", () => {
    expect(estHeurePointe(new Date("2026-10-20T03:30:00Z"))).toBe(true);
  });
  it("mardi 11h heure Réunion = creuse", () => {
    expect(estHeurePointe(new Date("2026-10-20T07:00:00Z"))).toBe(false);
  });
  it("samedi 7h30 = pas de pointe", () => {
    expect(estHeurePointe(new Date("2026-10-24T03:30:00Z"))).toBe(false);
  });
});

describe("calculerDevis", () => {
  it("applique le minimum sur un petit trajet", () => {
    const d = calculerDevis({ depart: "le-port", arrivee: "le-port", vehicule: "petit" });
    expect(d.transportCts).toBe(3000);
    expect(d.totalCts).toBe(3000 + 390);
  });

  it("la commission + la rémunération transporteur = prix du transport", () => {
    const d = calculerDevis({
      depart: "saint-denis",
      arrivee: "saint-pierre",
      vehicule: "moyen",
      aideManutention: true,
      etagesArrivee: 2,
      assuranceRenforcee: true,
      express: true,
    });
    expect(d.commissionCts + d.remunerationTransporteurCts).toBe(d.transportCts);
    expect(d.commissionCts).toBe(Math.round(d.transportCts * 0.2));
    expect(d.transportCts % 100).toBe(0);
  });

  it("majore en heure de pointe", () => {
    const base = { depart: "saint-denis", arrivee: "saint-paul", vehicule: "moyen" } as const;
    const creuse = calculerDevis({ ...base, dateEnlevement: new Date("2026-10-20T07:00:00Z") });
    const pointe = calculerDevis({ ...base, dateEnlevement: new Date("2026-10-20T03:30:00Z") });
    expect(pointe.heurePointe).toBe(true);
    expect(pointe.totalCts).toBeGreaterThan(creuse.totalCts);
  });
});
