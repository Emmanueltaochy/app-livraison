import { utilisateurCourant } from "@/lib/auth";
import { estSurLIle } from "@/lib/communes";
import { itineraireRoutier } from "@/lib/itineraire";

const lirePoint = (v: string | null) => {
  const [lat, lng] = (v ?? "").split(",").map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) && estSurLIle({ lat, lng }) ? { lat, lng } : null;
};

// Itinéraire pour la carte et le guidage du chauffeur. ?etapes=1 : manœuvres (tourner à droite…).
export async function GET(req: Request) {
  if (!(await utilisateurCourant())) return new Response("Non connecté", { status: 401 });
  const url = new URL(req.url);
  const de = lirePoint(url.searchParams.get("de"));
  const a = lirePoint(url.searchParams.get("a"));
  if (!de || !a) return new Response("Points invalides", { status: 400 });
  const itineraire = await itineraireRoutier(de, a, url.searchParams.get("etapes") === "1");
  if (!itineraire) return new Response("Itinéraire indisponible", { status: 502 });
  return Response.json(itineraire, { headers: { "cache-control": "private, max-age=60" } });
}
