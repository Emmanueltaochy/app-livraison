import { haversineKm, type Point } from "./communes";
import type { VehiculeId } from "./pricing";

// Choix des transporteurs à prévenir d'une nouvelle course (logique pure, testée).

const TAILLE: Record<VehiculeId, number> = { petit: 1, moyen: 2, grand: 3 };

export type Candidat = {
  id: string;
  vehicule: VehiculeId;
  en_ligne: boolean;
  position?: Point;
  position_le?: Date;
};

export const DISPATCH = {
  positionFraicheMs: 15 * 60 * 1000, // au-delà, la position d'un transporteur est jugée périmée
  rayonMaintenantKm: 40,
  maxMaintenant: 10,
  maxProgramme: 30,
} as const;

// Une commande « maintenant » va aux transporteurs en ligne, proches, au véhicule assez grand.
// Une commande programmée va à tous les transporteurs au véhicule assez grand, les plus proches d'abord.
export function choisirTransporteurs(
  candidats: Candidat[],
  commande: { vehicule: VehiculeId; mode: "maintenant" | "programme"; depart?: Point },
  maintenant = new Date(),
): string[] {
  const compatibles = candidats.filter((c) => TAILLE[c.vehicule] >= TAILLE[commande.vehicule]);
  const distance = (c: Candidat) => {
    const frais = c.position && c.position_le && maintenant.getTime() - c.position_le.getTime() < DISPATCH.positionFraicheMs;
    return frais && commande.depart ? haversineKm(c.position!, commande.depart) : Number.POSITIVE_INFINITY;
  };
  const classes = compatibles.map((c) => ({ c, km: distance(c) })).sort((a, b) => a.km - b.km);

  if (commande.mode === "maintenant") {
    return classes
      .filter(({ c, km }) => c.en_ligne && (km <= DISPATCH.rayonMaintenantKm || !commande.depart))
      .slice(0, DISPATCH.maxMaintenant)
      .map(({ c }) => c.id);
  }
  return classes.slice(0, DISPATCH.maxProgramme).map(({ c }) => c.id);
}
