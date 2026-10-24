// Moteur de prix. C'est la source de vérité : le serveur recalcule toujours
// le prix, on ne fait jamais confiance au montant envoyé par le navigateur.
// Tous les montants sont en centimes.

import { getCommune, haversineKm, type Point } from "./communes";
import { resumer, type Inventaire, type Resume, type TypeTransport } from "./inventaire";

export type VehiculeId = "petit" | "moyen" | "grand";

// Capacités utiles (on garde ~10 % de marge pour caler le chargement).
export const VEHICULES: Record<
  VehiculeId,
  {
    nom: string;
    description: string;
    charge: string;
    volumeMax: number; // m³
    poidsMax: number; // kg
    hayon: boolean;
    minutesIncluses: number; // manutention comprise dans le prix du trajet
    baseCts: number;
    parKmCts: number;
    minimumCts: number;
  }
> = {
  petit: {
    nom: "Petit utilitaire",
    description: "Type Kangoo · cartons, petit meuble, électroménager",
    charge: "3 m³ · 500 kg",
    volumeMax: 3,
    poidsMax: 500,
    hayon: false,
    minutesIncluses: 15,
    baseCts: 2500,
    parKmCts: 100,
    minimumCts: 3000,
  },
  moyen: {
    nom: "Utilitaire 12 m³",
    description: "Type Master · frigo, canapé, studio",
    charge: "12 m³ · 1,2 t",
    volumeMax: 12,
    poidsMax: 1200,
    hayon: false,
    minutesIncluses: 20,
    baseCts: 4500,
    parKmCts: 140,
    minimumCts: 5500,
  },
  grand: {
    nom: "Camion 20 m³ avec hayon",
    description: "Hayon élévateur · T2, palettes, matériaux",
    charge: "20 m³ · 1,5 t",
    volumeMax: 20,
    poidsMax: 1500,
    hayon: true,
    minutesIncluses: 30,
    baseCts: 7500,
    parKmCts: 190,
    minimumCts: 9000,
  },
};

const ORDRE_VEHICULES: VehiculeId[] = ["petit", "moyen", "grand"];

export const TARIFS = {
  commissionTaux: 0.2, // part plateforme sur le prix du transport
  fraisServiceCts: 390, // payés par le client, 100 % plateforme
  minuteManutentionCts: 50, // 30 €/h par personne, au-delà des minutes incluses
  personneSupplementaireCts: 2500, // déplacement d'un manutentionnaire en plus du chauffeur
  etageSansAscenseurTaux: 0.15, // +15 % du temps de manutention de ce côté, par étage
  ascenseurTaux: 0.05,
  portageLongTaux: 0.25, // camion à plus de 30 m de la porte
  assuranceRenforceeCts: 900,
  expressTaux: 0.25,
  heurePointeTaux: 0.15,
  dimancheFerieTaux: 0.2,
  facteurRoute: 1.4, // route réelle ≈ 1,4 × vol d'oiseau (relief réunionnais)
} as const;

export type Acces = { etage?: number; ascenseur?: boolean };

export type DemandeDevis = {
  depart: string; // id de commune
  arrivee: string;
  vehicule: VehiculeId;
  inventaire?: Inventaire;
  personnes?: number; // chauffeur compris (1 à 3)
  accesDepart?: Acces;
  accesArrivee?: Acces;
  portageLong?: boolean;
  demontage?: boolean;
  assuranceRenforcee?: boolean;
  express?: boolean;
  dateEnlevement?: Date;
  // Coordonnées exactes des adresses (Base Adresse Nationale) ; à défaut, centre de la commune.
  pointDepart?: Point;
  pointArrivee?: Point;
};

export type Devis = {
  distanceKm: number;
  transportCts: number; // part soumise à commission
  fraisServiceCts: number;
  totalCts: number; // payé par le client
  commissionCts: number;
  remunerationTransporteurCts: number;
  heurePointe: boolean;
  minutesManutention: number; // travail total (personne × minutes)
  dureeSurPlaceMin: number; // chargement + déchargement avec l'équipe choisie
  personnes: number;
  lignes: { libelle: string; montantCts: number }[];
};

// Véhicule le plus petit qui convient (null : trop volumineux ou trop lourd pour un seul voyage).
export function vehiculeConseille(r: Pick<Resume, "volume" | "poids" | "hayon">): VehiculeId | null {
  return ORDRE_VEHICULES.find((id) => {
    const v = VEHICULES[id];
    return r.volume <= v.volumeMax && r.poids <= v.poidsMax && (!r.hayon || v.hayon);
  }) ?? null;
}

export const vehiculeSuffit = (choisi: VehiculeId, conseille: VehiculeId | null) =>
  conseille !== null && ORDRE_VEHICULES.indexOf(choisi) >= ORDRE_VEHICULES.indexOf(conseille);

// Équipe minimale : 2 personnes pour un objet lourd ou un déménagement, 3 au-delà de 4 h de travail.
export function personnesMinimum(r: Pick<Resume, "lourd" | "minutes">, typeTransport?: TypeTransport): number {
  if (r.minutes > 240) return 3;
  return r.lourd || typeTransport === "demenagement" ? 2 : 1;
}
export function personnesConseillees(r: Pick<Resume, "lourd" | "minutes">, typeTransport?: TypeTransport): number {
  return Math.max(personnesMinimum(r, typeTransport), r.minutes > 90 ? 2 : 1);
}

// Temps de travail : chaque côté (chargement, déchargement) compte pour moitié, majoré par l'accès.
export function minutesManutention(d: Pick<DemandeDevis, "inventaire" | "accesDepart" | "accesArrivee" | "portageLong" | "demontage">): number {
  const r = resumer(d.inventaire ?? {});
  const cote = (a?: Acces) => {
    const etage = Math.max(0, a?.etage ?? 0);
    const majoration = etage === 0 ? 0 : a?.ascenseur ? TARIFS.ascenseurTaux : etage * TARIFS.etageSansAscenseurTaux;
    return (r.minutes / 2) * (1 + majoration);
  };
  const base = (cote(d.accesDepart) + cote(d.accesArrivee)) * (d.portageLong ? 1 + TARIFS.portageLongTaux : 1);
  return Math.round(base + (d.demontage ? r.demontage * 2 : 0));
}

export function distanceRouteKm(departId: string, arriveeId: string, pointDepart?: Point, pointArrivee?: Point): number {
  const a = getCommune(departId);
  const b = getCommune(arriveeId);
  if (!a || !b) throw new Error("Commune inconnue");
  if (!pointDepart || !pointArrivee) {
    if (a.id === b.id) return 5; // trajet intra-commune forfaitaire
    return Math.round(haversineKm(a, b) * TARIFS.facteurRoute + (a.detourKm ?? 0) + (b.detourKm ?? 0));
  }
  // Adresses précises : détour de montagne compté seulement en entrant ou sortant d'un cirque.
  const detour = a.id === b.id ? 0 : (a.detourKm ?? 0) + (b.detourKm ?? 0);
  return Math.max(2, Math.round(haversineKm(pointDepart, pointArrivee) * TARIFS.facteurRoute + detour));
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

// Dimanches et jours fériés à La Réunion (dont le 20 décembre, abolition de l'esclavage).
export function estDimancheOuFerie(date: Date): boolean {
  const r = new Date(date.getTime() + 4 * 3600 * 1000);
  if (r.getUTCDay() === 0) return true;
  const jm = `${r.getUTCMonth() + 1}-${r.getUTCDate()}`;
  if (["1-1", "5-1", "5-8", "7-14", "8-15", "11-1", "11-11", "12-20", "12-25"].includes(jm)) return true;
  // Lundi de Pâques, Ascension, lundi de Pentecôte (calcul de Pâques de Meeus).
  const a = r.getUTCFullYear();
  const [g, c] = [a % 19, Math.floor(a / 100)];
  const h = (c - Math.floor(c / 4) - Math.floor((8 * c + 13) / 25) + 19 * g + 15) % 30;
  const i = h - Math.floor(h / 28) * (1 - Math.floor(29 / (h + 1)) * Math.floor((21 - g) / 11));
  const j = (a + Math.floor(a / 4) + i + 2 - c + Math.floor(c / 4)) % 7;
  const mois = 3 + Math.floor((i - j + 40) / 44);
  const paques = Date.UTC(a, mois - 1, i - j + 28 - 31 * Math.floor(mois / 4));
  const jour = Date.UTC(a, r.getUTCMonth(), r.getUTCDate());
  return [1, 39, 50].some((n) => jour === paques + n * 86_400_000);
}

const arrondiEuro = (cts: number) => Math.round(cts / 100) * 100;
const duree = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, "0")}` : ""}`);

export function calculerDevis(d: DemandeDevis): Devis {
  const v = VEHICULES[d.vehicule];
  if (!v) throw new Error("Véhicule inconnu");

  const distanceKm = distanceRouteKm(d.depart, d.arrivee, d.pointDepart, d.pointArrivee);
  const lignes: Devis["lignes"] = [];

  // Trajet : chauffeur compris, avec quelques minutes de manutention incluses.
  const trajet = Math.max(v.minimumCts, v.baseCts + distanceKm * v.parKmCts);
  lignes.push({ libelle: `${v.nom} · ${distanceKm} km`, montantCts: trajet });
  let transport = trajet;

  // Manutention : travail total au-delà des minutes incluses, quel que soit le nombre de personnes
  // (à deux, c'est deux fois plus rapide) ; chaque personne en plus du chauffeur a un forfait de déplacement.
  const travail = minutesManutention(d);
  const personnes = Math.min(3, Math.max(1, Math.round(d.personnes ?? 1)));
  const facturees = Math.max(0, travail - v.minutesIncluses);
  if (facturees > 0) {
    const m = facturees * TARIFS.minuteManutentionCts;
    lignes.push({ libelle: `Manutention · ${duree(facturees)} au-delà de ${v.minutesIncluses} min incluses`, montantCts: m });
    transport += m;
  }
  if (personnes > 1) {
    const m = (personnes - 1) * TARIFS.personneSupplementaireCts;
    lignes.push({ libelle: personnes === 2 ? "2e personne" : `${personnes - 1} personnes en plus du chauffeur`, montantCts: m });
    transport += m;
  }

  const heurePointe = d.dateEnlevement ? estHeurePointe(d.dateEnlevement) : false;
  if (heurePointe) {
    const m = Math.round(trajet * TARIFS.heurePointeTaux);
    lignes.push({ libelle: "Heure de pointe", montantCts: m });
    transport += m;
  }
  if (d.express) {
    const m = Math.round(trajet * TARIFS.expressTaux);
    lignes.push({ libelle: "Express · prise en charge dans l'heure", montantCts: m });
    transport += m;
  }
  if (d.dateEnlevement && estDimancheOuFerie(d.dateEnlevement)) {
    const m = Math.round(transport * TARIFS.dimancheFerieTaux);
    lignes.push({ libelle: "Dimanche ou jour férié", montantCts: m });
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
    minutesManutention: travail,
    dureeSurPlaceMin: Math.round(travail / personnes),
    personnes,
    lignes,
  };
}

export const dureeLisible = duree;

export const euros = (cts: number) =>
  (cts / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
