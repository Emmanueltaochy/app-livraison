// Les 24 communes de La Réunion, avec un point central approximatif.
// `detourKm` ajoute la distance réelle des routes de montagne (cirques, Plaine)
// que la distance à vol d'oiseau ne capte pas.

export type Commune = {
  id: string;
  nom: string;
  lat: number;
  lng: number;
  detourKm?: number;
};

export const COMMUNES: Commune[] = [
  { id: "saint-denis", nom: "Saint-Denis", lat: -20.882, lng: 55.45 },
  { id: "sainte-marie", nom: "Sainte-Marie", lat: -20.897, lng: 55.549 },
  { id: "sainte-suzanne", nom: "Sainte-Suzanne", lat: -20.906, lng: 55.607 },
  { id: "saint-andre", nom: "Saint-André", lat: -20.963, lng: 55.65 },
  { id: "bras-panon", nom: "Bras-Panon", lat: -21.0, lng: 55.677 },
  { id: "saint-benoit", nom: "Saint-Benoît", lat: -21.034, lng: 55.713 },
  { id: "plaine-des-palmistes", nom: "La Plaine-des-Palmistes", lat: -21.134, lng: 55.628, detourKm: 8 },
  { id: "sainte-rose", nom: "Sainte-Rose", lat: -21.128, lng: 55.794 },
  { id: "saint-philippe", nom: "Saint-Philippe", lat: -21.358, lng: 55.767 },
  { id: "saint-joseph", nom: "Saint-Joseph", lat: -21.378, lng: 55.619 },
  { id: "petite-ile", nom: "Petite-Île", lat: -21.354, lng: 55.565 },
  { id: "saint-pierre", nom: "Saint-Pierre", lat: -21.339, lng: 55.478 },
  { id: "le-tampon", nom: "Le Tampon", lat: -21.278, lng: 55.515 },
  { id: "entre-deux", nom: "L'Entre-Deux", lat: -21.247, lng: 55.471 },
  { id: "saint-louis", nom: "Saint-Louis", lat: -21.286, lng: 55.411 },
  { id: "etang-sale", nom: "L'Étang-Salé", lat: -21.266, lng: 55.366 },
  { id: "les-avirons", nom: "Les Avirons", lat: -21.241, lng: 55.335 },
  { id: "saint-leu", nom: "Saint-Leu", lat: -21.171, lng: 55.288 },
  { id: "trois-bassins", nom: "Les Trois-Bassins", lat: -21.104, lng: 55.298 },
  { id: "saint-paul", nom: "Saint-Paul", lat: -21.01, lng: 55.27 },
  { id: "le-port", nom: "Le Port", lat: -20.937, lng: 55.293 },
  { id: "la-possession", nom: "La Possession", lat: -20.925, lng: 55.336 },
  { id: "salazie", nom: "Salazie", lat: -21.027, lng: 55.54, detourKm: 10 },
  { id: "cilaos", nom: "Cilaos", lat: -21.135, lng: 55.471, detourKm: 25 },
];

const PAR_ID = new Map(COMMUNES.map((c) => [c.id, c]));

export function getCommune(id: string): Commune | undefined {
  return PAR_ID.get(id);
}
