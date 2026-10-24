// Moteur de prix. C'est la source de vérité : le serveur recalcule toujours
// le prix, on ne fait jamais confiance au montant envoyé par le navigateur.
// Tous les montants sont en centimes.

import { getCommune, type Commune } from "./communes";

export type VehiculeId = "petit" | "moyen" | "grand";

export const VEHICULES: Record<
  VehiculeId,
  { nom: string; description: string; charge: string; baseCts: number; parKmCts: number; minimumCts: number }
> = {
  petit: {
    nom: "Petit utilitaire",
    description: "Type Kangoo · cartons, petit meuble, électroménager",
    charge: "500 kg",
    baseCts: 2500,
    parKmCts: 100,
    minimumCts: 3000,
  },
  moyen: {
    nom: "Utilitaire 12 m³",
    description: "Type Master · frigo, canapé, petit déménagement",
    charge: "1,2 t",
    baseCts: 4500,
    parKmCts: 140,
    minimumCts: 5500,
  },
  grand: {
    nom: "Camion 20 m³ avec hayon",
    description: "Hayon élévateur · déménagement, matériaux, palettes",
    charge: "1,5 t",
    baseCts: 7500,
    parKmCts: 190,
    minimumCts: 9000,
  },
};

export const TARIFS = {
  commissionTaux: 0.2, // part plateforme sur le prix du transport
  fraisServiceCts: 390, // payés par le client, 100 % plateforme
  aideManutentionCts: 3500, // 2e personne
  parEtageSansAscenseurCts: 800,
  assuranceRenforceeCts: 900,
  expressTaux: 0.25,
  heurePointeTaux: 0.15,
  facteurRoute: 1.4, // route réelle ≈ 1,4 × vol d'oiseau (relief réunionnais)
} as const;

export type DemandeDevis = {
  depart: string; // id de commune
  arrivee: string;
  vehicule: VehiculeId;
  aideManutention?: boolean;
  etagesDepart?: number; // étages sans ascenseur
  etagesArrivee?: number;
  assuranceRenforcee?: boolean;
  express?: boolean;
  dateEnlevement?: Date;
};

export type Devis = {
  distanceKm: number;
  transportCts: number; // part soumise à commission
  fraisServiceCts: number;
  totalCts: number; // payé par le client
  commissionCts: number;
  remunerationTransporteurCts: number;
  heurePointe: boolean;
  lignes: { libelle: string; montantCts: number }[];
};

function haversineKm(a: Commune, b: Commune): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function distanceRouteKm(departId: string, arriveeId: string): number {
  const a = getCommune(departId);
  const b = getCommune(arriveeId);
  if (!a || !b) throw new Error("Commune inconnue");
  if (a.id === b.id) return 5; // trajet intra-commune forfaitaire
  const km = haversineKm(a, b) * TARIFS.facteurRoute + (a.detourKm ?? 0) + (b.detourKm ?? 0);
  return Math.round(km);
}

// Bouchons : lun–ven 6h30–8h30 et 15h30–18h30, heure de La Réunion (UTC+4, sans heure d'été).
export function estHeurePointe(date: Date): boolean {
  const reunion = new Date(date.getTime() + 4 * 3600 * 1000);
  const jour = reunion.getUTCDay();
  if (jour === 0 || jour === 6) return false;
  const minutes = reunion.getUTCHours() * 60 + reunion.getUTCMinutes();
  return (minutes >= 390 && minutes < 510) || (minutes >= 930 && minutes < 1110);
}

// Premier horaire hors bouchons après une heure de pointe (même jour), pour proposer moins cher.
export function prochainCreneauCreux(date: Date): Date | null {
  if (!estHeurePointe(date)) return null;
  const reunion = new Date(date.getTime() + 4 * 3600 * 1000);
  const minutes = reunion.getUTCHours() * 60 + reunion.getUTCMinutes();
  const fin = minutes < 510 ? 510 : 1110; // 8h30 ou 18h30
  return new Date(date.getTime() + (fin - minutes) * 60 * 1000);
}

const arrondiEuro = (cts: number) => Math.round(cts / 100) * 100;

export function calculerDevis(d: DemandeDevis): Devis {
  const v = VEHICULES[d.vehicule];
  if (!v) throw new Error("Véhicule inconnu");

  const distanceKm = distanceRouteKm(d.depart, d.arrivee);
  const lignes: Devis["lignes"] = [];

  const trajet = Math.max(v.minimumCts, v.baseCts + distanceKm * v.parKmCts);
  lignes.push({ libelle: `${v.nom} — ${distanceKm} km`, montantCts: trajet });

  let transport = trajet;

  const heurePointe = d.dateEnlevement ? estHeurePointe(d.dateEnlevement) : false;
  if (heurePointe) {
    const m = Math.round(trajet * TARIFS.heurePointeTaux);
    lignes.push({ libelle: "Heure de pointe", montantCts: m });
    transport += m;
  }
  if (d.express) {
    const m = Math.round(trajet * TARIFS.expressTaux);
    lignes.push({ libelle: "Express (dans les 2 h)", montantCts: m });
    transport += m;
  }
  if (d.aideManutention) {
    lignes.push({ libelle: "Aide à la manutention (2e personne)", montantCts: TARIFS.aideManutentionCts });
    transport += TARIFS.aideManutentionCts;
  }
  const etages = Math.max(0, d.etagesDepart ?? 0) + Math.max(0, d.etagesArrivee ?? 0);
  if (etages > 0) {
    const m = etages * TARIFS.parEtageSansAscenseurCts;
    lignes.push({ libelle: `Étages sans ascenseur (${etages})`, montantCts: m });
    transport += m;
  }
  if (d.assuranceRenforcee) {
    lignes.push({ libelle: "Assurance renforcée", montantCts: TARIFS.assuranceRenforceeCts });
    transport += TARIFS.assuranceRenforceeCts;
  }

  const transportCts = arrondiEuro(transport);
  const commissionCts = Math.round(transportCts * TARIFS.commissionTaux);
  lignes.push({ libelle: "Frais de service", montantCts: TARIFS.fraisServiceCts });

  return {
    distanceKm,
    transportCts,
    fraisServiceCts: TARIFS.fraisServiceCts,
    totalCts: transportCts + TARIFS.fraisServiceCts,
    commissionCts,
    remunerationTransporteurCts: transportCts - commissionCts,
    heurePointe,
    lignes,
  };
}

export const euros = (cts: number) =>
  (cts / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
