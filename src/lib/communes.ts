// Les 24 communes de La Réunion, avec un point central approximatif.
// `detourKm` ajoute la distance réelle des routes de montagne (cirques, Plaine)
// que la distance à vol d'oiseau ne capte pas.

export type Commune = {
  id: string;
  insee: string; // code INSEE, renvoyé par la Base Adresse Nationale (citycode)
  nom: string;
  lat: number;
  lng: number;
  detourKm?: number;
};

export const COMMUNES: Commune[] = [
  { id: "saint-denis", insee: "97411", nom: "Saint-Denis", lat: -20.882, lng: 55.45 },
  { id: "sainte-marie", insee: "97418", nom: "Sainte-Marie", lat: -20.897, lng: 55.549 },
  { id: "sainte-suzanne", insee: "97420", nom: "Sainte-Suzanne", lat: -20.906, lng: 55.607 },
  { id: "saint-andre", insee: "97409", nom: "Saint-André", lat: -20.963, lng: 55.65 },
  { id: "bras-panon", insee: "97402", nom: "Bras-Panon", lat: -21.0, lng: 55.677 },
  { id: "saint-benoit", insee: "97410", nom: "Saint-Benoît", lat: -21.034, lng: 55.713 },
  { id: "plaine-des-palmistes", insee: "97406", nom: "La Plaine-des-Palmistes", lat: -21.134, lng: 55.628, detourKm: 8 },
  { id: "sainte-rose", insee: "97419", nom: "Sainte-Rose", lat: -21.128, lng: 55.794 },
  { id: "saint-philippe", insee: "97417", nom: "Saint-Philippe", lat: -21.358, lng: 55.767 },
  { id: "saint-joseph", insee: "97412", nom: "Saint-Joseph", lat: -21.378, lng: 55.619 },
  { id: "petite-ile", insee: "97405", nom: "Petite-Île", lat: -21.354, lng: 55.565 },
  { id: "saint-pierre", insee: "97416", nom: "Saint-Pierre", lat: -21.339, lng: 55.478 },
  { id: "le-tampon", insee: "97422", nom: "Le Tampon", lat: -21.278, lng: 55.515 },
  { id: "entre-deux", insee: "97403", nom: "L'Entre-Deux", lat: -21.247, lng: 55.471 },
  { id: "saint-louis", insee: "97414", nom: "Saint-Louis", lat: -21.286, lng: 55.411 },
  { id: "etang-sale", insee: "97404", nom: "L'Étang-Salé", lat: -21.266, lng: 55.366 },
  { id: "les-avirons", insee: "97401", nom: "Les Avirons", lat: -21.241, lng: 55.335 },
  { id: "saint-leu", insee: "97413", nom: "Saint-Leu", lat: -21.171, lng: 55.288 },
  { id: "trois-bassins", insee: "97423", nom: "Les Trois-Bassins", lat: -21.104, lng: 55.298 },
  { id: "saint-paul", insee: "97415", nom: "Saint-Paul", lat: -21.01, lng: 55.27 },
  { id: "le-port", insee: "97407", nom: "Le Port", lat: -20.937, lng: 55.293 },
  { id: "la-possession", insee: "97408", nom: "La Possession", lat: -20.925, lng: 55.336 },
  { id: "salazie", insee: "97421", nom: "Salazie", lat: -21.027, lng: 55.54, detourKm: 10 },
  { id: "cilaos", insee: "97424", nom: "Cilaos", lat: -21.135, lng: 55.471, detourKm: 25 },
];

const PAR_ID = new Map(COMMUNES.map((c) => [c.id, c]));

export function getCommune(id: string): Commune | undefined {
  return PAR_ID.get(id);
}

const PAR_INSEE = new Map(COMMUNES.map((c) => [c.insee, c]));

export function communeParInsee(code: string): Commune | undefined {
  return PAR_INSEE.get(code);
}

export type Point = { lat: number; lng: number };

// Emprise de La Réunion : refuse les coordonnées hors de l'île.
export function estSurLIle(p: Point): boolean {
  return p.lat > -21.42 && p.lat < -20.85 && p.lng > 55.2 && p.lng < 55.85;
}
