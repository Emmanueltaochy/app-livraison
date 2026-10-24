import "server-only";
import type { Point } from "./communes";

// Itinéraire routier OSRM (données OpenStreetMap, gratuit) avec un petit cache mémoire :
// plusieurs écrans de suivi qui interrogent la même position ne relancent pas le calcul.
const OSRM = "https://router.project-osrm.org/route/v1/driving";
const DUREE_CACHE_MS = 60_000;

export type Etape = { type: string; direction: string | null; sortie: number | null; rue: string; point: Point };
export type Itineraire = { minutes: number; km: number; ligne: [number, number][]; etapes?: Etape[] };

type OsrmEtape = { name?: string; ref?: string; maneuver: { type: string; modifier?: string; exit?: number; location: [number, number] } };

const cache = new Map<string, { quand: number; valeur: Itineraire }>();

export async function itineraireRoutier(de: Point, a: Point, etapes = false): Promise<Itineraire | null> {
  const cle = `${de.lat.toFixed(4)},${de.lng.toFixed(4)};${a.lat.toFixed(4)},${a.lng.toFixed(4)};${etapes}`;
  const enCache = cache.get(cle);
  if (enCache && Date.now() - enCache.quand < DUREE_CACHE_MS) return enCache.valeur;
  try {
    const r = await fetch(`${OSRM}/${de.lng},${de.lat};${a.lng},${a.lat}?overview=full&geometries=geojson&steps=${etapes}`, {
      signal: AbortSignal.timeout(6000),
    });
    const route = (await r.json()).routes?.[0];
    if (!route) return null;
    const valeur: Itineraire = {
      minutes: Math.max(1, Math.round(route.duration / 60)),
      km: route.distance / 1000,
      ligne: route.geometry.coordinates,
      etapes: etapes
        ? route.legs[0].steps.map((e: OsrmEtape) => ({
            type: e.maneuver.type,
            direction: e.maneuver.modifier ?? null,
            sortie: e.maneuver.exit ?? null,
            rue: e.name || e.ref || "",
            point: { lng: e.maneuver.location[0], lat: e.maneuver.location[1] },
          }))
        : undefined,
    };
    if (cache.size > 500) cache.clear();
    cache.set(cle, { quand: Date.now(), valeur });
    return valeur;
  } catch {
    return null;
  }
}
