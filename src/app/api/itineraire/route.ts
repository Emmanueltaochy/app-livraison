import { utilisateurCourant } from "@/lib/auth";
import { estSurLIle } from "@/lib/communes";

// Itinéraire routier (OSRM, données OpenStreetMap) calculé côté serveur : pas de souci CORS sur les
// téléphones, et une seule source à remplacer si on passe un jour à un service payant.
const OSRM = "https://router.project-osrm.org/route/v1/driving";

const lirePoint = (v: string | null) => {
  const [lat, lng] = (v ?? "").split(",").map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) && estSurLIle({ lat, lng }) ? { lat, lng } : null;
};

export async function GET(req: Request) {
  if (!(await utilisateurCourant())) return new Response("Non connecté", { status: 401 });
  const url = new URL(req.url);
  const de = lirePoint(url.searchParams.get("de"));
  const a = lirePoint(url.searchParams.get("a"));
  if (!de || !a) return new Response("Points invalides", { status: 400 });

  try {
    const r = await fetch(`${OSRM}/${de.lng},${de.lat};${a.lng},${a.lat}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(6000) });
    const route = (await r.json()).routes?.[0];
    if (!route) throw new Error("Pas d'itinéraire");
    return Response.json(
      { minutes: Math.max(1, Math.round(route.duration / 60)), km: route.distance / 1000, ligne: route.geometry.coordinates },
      { headers: { "cache-control": "private, max-age=60" } },
    );
  } catch {
    return new Response("Itinéraire indisponible", { status: 502 });
  }
}
