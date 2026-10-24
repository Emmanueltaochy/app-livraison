// Catalogue d'objets pour l'inventaire, comme les calculateurs de volume des déménageurs en métropole.
// Pour chaque objet : volume (m³), poids (kg), temps de manutention chargement + déchargement
// (en minutes de travail pour une personne), objet lourd (2 personnes au minimum),
// et temps de démontage + remontage s'il se démonte. Valeurs provisoires, à ajuster après l'étude.

export type TypeTransport = "objets" | "magasin" | "demenagement" | "materiaux";

export const TYPES_TRANSPORT: Record<TypeTransport, { nom: string; detail: string }> = {
  objets: { nom: "Meubles et objets", detail: "Un achat Leboncoin, un canapé, un frigo…" },
  magasin: { nom: "Livraison magasin", detail: "Vos achats livrés depuis le magasin" },
  demenagement: { nom: "Déménagement", detail: "Studio, T2 : tout le logement" },
  materiaux: { nom: "Palettes et matériaux", detail: "Chantier, BTP, marchandise sur palette" },
};

export type Categorie = "meubles" | "electromenager" | "cartons" | "divers" | "materiaux";

export const CATEGORIES: Record<Categorie, string> = {
  meubles: "Meubles",
  electromenager: "Électroménager",
  cartons: "Cartons et bagages",
  divers: "Divers",
  materiaux: "Matériaux",
};

export type Objet = {
  nom: string;
  categorie: Categorie;
  volume: number;
  poids: number;
  minutes: number;
  lourd?: boolean;
  demontage?: number;
  hayon?: boolean; // ne se charge qu'avec un hayon élévateur (palette, big bag)
};

export const OBJETS = {
  canape_2: { nom: "Canapé 2 places", categorie: "meubles", volume: 1.5, poids: 40, minutes: 10, lourd: true },
  canape_3: { nom: "Canapé 3 places", categorie: "meubles", volume: 2, poids: 60, minutes: 12, lourd: true },
  canape_angle: { nom: "Canapé d'angle", categorie: "meubles", volume: 3, poids: 90, minutes: 18, lourd: true, demontage: 10 },
  fauteuil: { nom: "Fauteuil", categorie: "meubles", volume: 0.6, poids: 15, minutes: 4 },
  lit_simple: { nom: "Lit 1 place + matelas", categorie: "meubles", volume: 1, poids: 35, minutes: 8, demontage: 10 },
  lit_double: { nom: "Lit 2 places + matelas", categorie: "meubles", volume: 1.8, poids: 60, minutes: 12, lourd: true, demontage: 15 },
  matelas: { nom: "Matelas seul", categorie: "meubles", volume: 0.6, poids: 25, minutes: 4 },
  armoire_2: { nom: "Armoire 2 portes", categorie: "meubles", volume: 1.5, poids: 60, minutes: 12, lourd: true, demontage: 20 },
  armoire_3: { nom: "Armoire 3 portes", categorie: "meubles", volume: 2.2, poids: 90, minutes: 15, lourd: true, demontage: 30 },
  commode: { nom: "Commode", categorie: "meubles", volume: 0.6, poids: 35, minutes: 6 },
  buffet: { nom: "Buffet / bahut", categorie: "meubles", volume: 1, poids: 50, minutes: 8, lourd: true },
  table: { nom: "Table", categorie: "meubles", volume: 0.8, poids: 30, minutes: 6, demontage: 10 },
  chaise: { nom: "Chaise", categorie: "meubles", volume: 0.2, poids: 5, minutes: 1 },
  bureau: { nom: "Bureau", categorie: "meubles", volume: 0.8, poids: 35, minutes: 6, demontage: 10 },
  etagere: { nom: "Étagère / bibliothèque", categorie: "meubles", volume: 0.8, poids: 30, minutes: 6, demontage: 10 },
  meuble_tv: { nom: "Meuble TV", categorie: "meubles", volume: 0.5, poids: 25, minutes: 4 },

  frigo: { nom: "Réfrigérateur", categorie: "electromenager", volume: 1, poids: 70, minutes: 10, lourd: true },
  frigo_us: { nom: "Frigo américain", categorie: "electromenager", volume: 1.6, poids: 120, minutes: 15, lourd: true },
  congelateur: { nom: "Congélateur", categorie: "electromenager", volume: 0.8, poids: 60, minutes: 10, lourd: true },
  lave_linge: { nom: "Lave-linge", categorie: "electromenager", volume: 0.5, poids: 70, minutes: 10, lourd: true },
  seche_linge: { nom: "Sèche-linge", categorie: "electromenager", volume: 0.5, poids: 45, minutes: 8, lourd: true },
  lave_vaisselle: { nom: "Lave-vaisselle", categorie: "electromenager", volume: 0.4, poids: 45, minutes: 8 },
  cuisiniere: { nom: "Cuisinière / four", categorie: "electromenager", volume: 0.4, poids: 45, minutes: 8 },
  micro_ondes: { nom: "Micro-ondes", categorie: "electromenager", volume: 0.1, poids: 15, minutes: 1 },
  television: { nom: "Télévision", categorie: "electromenager", volume: 0.3, poids: 15, minutes: 3 },
  climatiseur: { nom: "Climatiseur / ventilateur", categorie: "electromenager", volume: 0.3, poids: 25, minutes: 3 },

  carton: { nom: "Carton standard", categorie: "cartons", volume: 0.1, poids: 15, minutes: 1 },
  carton_livres: { nom: "Carton de livres", categorie: "cartons", volume: 0.06, poids: 20, minutes: 1 },
  valise: { nom: "Valise / sac", categorie: "cartons", volume: 0.15, poids: 15, minutes: 1 },

  petit_objet: { nom: "Petit objet (≤ 0,1 m³)", categorie: "divers", volume: 0.1, poids: 10, minutes: 1 },
  objet_moyen: { nom: "Objet moyen (≈ 0,5 m³)", categorie: "divers", volume: 0.5, poids: 25, minutes: 4 },
  gros_objet: { nom: "Gros objet (≈ 1 m³)", categorie: "divers", volume: 1, poids: 50, minutes: 8, lourd: true },
  velo: { nom: "Vélo", categorie: "divers", volume: 0.5, poids: 15, minutes: 2 },
  scooter: { nom: "Scooter / moto", categorie: "divers", volume: 1.5, poids: 120, minutes: 15, lourd: true },
  salon_jardin: { nom: "Salon de jardin", categorie: "divers", volume: 1.2, poids: 30, minutes: 8 },
  barbecue: { nom: "Barbecue / plancha", categorie: "divers", volume: 0.4, poids: 20, minutes: 3 },
  plante: { nom: "Plante en pot", categorie: "divers", volume: 0.2, poids: 15, minutes: 2 },

  palette: { nom: "Palette (≤ 400 kg)", categorie: "materiaux", volume: 1.3, poids: 400, minutes: 5, hayon: true },
  big_bag: { nom: "Big bag (sable, gravier)", categorie: "materiaux", volume: 1, poids: 1000, minutes: 5, hayon: true },
  sac_25: { nom: "Sac 25 kg (ciment, colle)", categorie: "materiaux", volume: 0.02, poids: 25, minutes: 0.5 },
  plaque_platre: { nom: "Plaque de plâtre", categorie: "materiaux", volume: 0.04, poids: 25, minutes: 1 },
  carrelage: { nom: "Carton de carrelage", categorie: "materiaux", volume: 0.02, poids: 25, minutes: 0.5 },
  barre: { nom: "Tôle, barre ou planche", categorie: "materiaux", volume: 0.03, poids: 12, minutes: 0.5 },
  parpaings: { nom: "Parpaings (lot de 10)", categorie: "materiaux", volume: 0.1, poids: 200, minutes: 4 },
} satisfies Record<string, Objet>;

export type ObjetId = keyof typeof OBJETS;
export type Inventaire = Partial<Record<ObjetId, number>>;

export const estObjet = (id: string): id is ObjetId => Object.prototype.hasOwnProperty.call(OBJETS, id);
const objet = (id: ObjetId): Objet => OBJETS[id];

// Catégories proposées en premier selon le type de transport.
export const CATEGORIES_PAR_TYPE: Record<TypeTransport, Categorie[]> = {
  objets: ["meubles", "electromenager", "divers", "cartons"],
  magasin: ["electromenager", "meubles", "divers", "cartons"],
  demenagement: ["meubles", "electromenager", "cartons", "divers"],
  materiaux: ["materiaux", "divers"],
};

// Inventaires types pour démarrer un déménagement en un geste (modifiables ensuite).
export const LOGEMENTS_TYPES: { nom: string; inventaire: Inventaire }[] = [
  {
    nom: "Studio",
    inventaire: { lit_double: 1, armoire_2: 1, canape_2: 1, table: 1, chaise: 2, frigo: 1, lave_linge: 1, micro_ondes: 1, television: 1, carton: 15 },
  },
  {
    nom: "T2",
    inventaire: {
      lit_double: 1, armoire_2: 1, canape_3: 1, table: 1, chaise: 4, commode: 1, etagere: 1, meuble_tv: 1,
      frigo: 1, lave_linge: 1, micro_ondes: 1, television: 1, carton: 25,
    },
  },
];

export type Resume = {
  volume: number; // m³
  poids: number; // kg
  minutes: number; // manutention (chargement + déchargement), pour une personne
  demontage: number; // minutes de démontage + remontage possibles
  lourd: boolean;
  hayon: boolean;
  nombre: number;
};

export function resumer(inv: Inventaire): Resume {
  const r: Resume = { volume: 0, poids: 0, minutes: 0, demontage: 0, lourd: false, hayon: false, nombre: 0 };
  for (const [id, qte] of Object.entries(inv)) {
    if (!estObjet(id) || !qte || qte <= 0) continue;
    const o = objet(id);
    r.volume += o.volume * qte;
    r.poids += o.poids * qte;
    r.minutes += o.minutes * qte;
    r.demontage += (o.demontage ?? 0) * qte;
    r.lourd ||= Boolean(o.lourd);
    r.hayon ||= Boolean(o.hayon);
    r.nombre += qte;
  }
  r.volume = Math.round(r.volume * 10) / 10;
  return r;
}

// « 1 × Canapé 3 places, 6 × Carton standard » : lisible par le transporteur.
export function decrire(inv: Inventaire): string {
  return Object.entries(inv)
    .filter(([id, q]) => estObjet(id) && q && q > 0)
    .map(([id, q]) => `${q} × ${objet(id as ObjetId).nom}`)
    .join(", ");
}

// Nettoie un inventaire reçu du navigateur : objets connus, quantités entières de 1 à 200.
export function lireInventaire(brut: unknown): Inventaire {
  const inv: Inventaire = {};
  if (!brut || typeof brut !== "object") return inv;
  for (const [id, q] of Object.entries(brut as Record<string, unknown>)) {
    const n = Math.floor(Number(q));
    if (estObjet(id) && n > 0) inv[id] = Math.min(n, 200);
  }
  return inv;
}
