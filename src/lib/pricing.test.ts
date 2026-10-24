import { describe, expect, it } from "vitest";
import { lireInventaire, resumer } from "./inventaire";
import {
  calculerDevis,
  distanceRouteKm,
  estDimancheOuFerie,
  estHeurePointe,
  minutesManutention,
  personnesMinimum,
  prochainCreneauCreux,
  vehiculeConseille,
} from "./pricing";

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

  it("utilise les coordonnées exactes quand elles sont connues", () => {
    // 12 rue de Paris (Saint-Denis) → mairie de Saint-Pierre
    const km = distanceRouteKm("saint-denis", "saint-pierre", { lat: -20.8808, lng: 55.4491 }, { lat: -21.3393, lng: 55.4781 });
    expect(km).toBeGreaterThan(65);
    expect(km).toBeLessThan(80);
    expect(distanceRouteKm("le-port", "le-port", { lat: -20.937, lng: 55.293 }, { lat: -20.9371, lng: 55.2931 })).toBe(2);
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
      inventaire: { canape_3: 1, carton: 10 },
      personnes: 2,
      accesArrivee: { etage: 2 },
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

describe("prochainCreneauCreux", () => {
  it("matin 7h30 → 8h30, soir 16h → 18h30, hors pointe → null", () => {
    expect(prochainCreneauCreux(new Date("2026-10-20T03:30:00Z"))?.toISOString()).toBe("2026-10-20T04:30:00.000Z");
    expect(prochainCreneauCreux(new Date("2026-10-20T12:00:00Z"))?.toISOString()).toBe("2026-10-20T14:30:00.000Z");
    expect(prochainCreneauCreux(new Date("2026-10-20T07:00:00Z"))).toBeNull();
  });
});

describe("inventaire", () => {
  it("calcule volume et poids, et conseille le plus petit véhicule qui convient", () => {
    expect(vehiculeConseille(resumer({ carton: 5 }))).toBe("petit");
    expect(vehiculeConseille(resumer({ canape_3: 1, frigo: 1, carton: 10 }))).toBe("moyen"); // 4 m³
    expect(vehiculeConseille(resumer({ palette: 1 }))).toBe("grand"); // hayon
    expect(vehiculeConseille(resumer({ big_bag: 2 }))).toBeNull(); // 2 t : trop lourd
  });

  it("objet lourd ou déménagement : 2 personnes au minimum", () => {
    expect(personnesMinimum(resumer({ carton: 5 }))).toBe(1);
    expect(personnesMinimum(resumer({ frigo: 1 }))).toBe(2);
    expect(personnesMinimum(resumer({ carton: 5 }), "demenagement")).toBe(2);
  });

  it("étages sans ascenseur, portage et démontage allongent la manutention", () => {
    const inventaire = { armoire_2: 1, carton: 8 }; // 20 min de travail
    const rdc = minutesManutention({ inventaire });
    expect(rdc).toBe(20);
    expect(minutesManutention({ inventaire, accesDepart: { etage: 2 } })).toBe(23); // 10 × 1,30 + 10
    expect(minutesManutention({ inventaire, accesDepart: { etage: 2, ascenseur: true } })).toBe(21);
    expect(minutesManutention({ inventaire, portageLong: true })).toBe(25);
    expect(minutesManutention({ inventaire, demontage: true })).toBe(60); // + 2 × 20 min
  });

  it("un seul meuble coûte moins cher qu'un meuble et des cartons", () => {
    const base = { depart: "saint-denis", arrivee: "saint-paul", vehicule: "moyen" as const, personnes: 2 };
    const seul = calculerDevis({ ...base, inventaire: { canape_3: 1 } });
    const plus = calculerDevis({ ...base, inventaire: { canape_3: 1, armoire_2: 1, carton: 20 } });
    expect(seul.lignes.some((l) => l.libelle.startsWith("Manutention"))).toBe(false); // 12 min ≤ 20 incluses
    expect(plus.totalCts).toBeGreaterThan(seul.totalCts);
  });

  it("ignore les objets inconnus et les quantités invalides", () => {
    expect(lireInventaire({ carton: "3", inconnu: 2, frigo: -1, chaise: 999 })).toEqual({ carton: 3, chaise: 200 });
  });
});

describe("estDimancheOuFerie", () => {
  it("dimanche, 20 décembre et lundi de Pâques", () => {
    expect(estDimancheOuFerie(new Date("2026-10-25T06:00:00Z"))).toBe(true); // dimanche
    expect(estDimancheOuFerie(new Date("2026-12-20T06:00:00Z"))).toBe(true);
    expect(estDimancheOuFerie(new Date("2026-04-06T06:00:00Z"))).toBe(true); // Pâques 2026 : 5 avril
    expect(estDimancheOuFerie(new Date("2026-10-20T06:00:00Z"))).toBe(false);
  });
});
