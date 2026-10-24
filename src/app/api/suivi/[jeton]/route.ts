import { getCommune } from "@/lib/communes";
import { une } from "@/lib/db";
import { itineraireRoutier } from "@/lib/itineraire";

// État en direct d'une commande pour la page de suivi (accès par le jeton secret du client).
export async function GET(_: Request, { params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  if (!/^[a-f0-9]{32}$/.test(jeton)) return new Response("Introuvable", { status: 404 });
  const c = await une(
    `select c.statut, c.commune_depart, c.commune_arrivee, c.depart_lat, c.depart_lng, c.arrivee_lat, c.arrivee_lng,
            t.position_lat, t.position_lng, t.position_le
     from commandes c left join transporteurs t on t.id = c.transporteur_id
     where c.jeton_suivi = $1`,
    [jeton],
  );
  if (!c) return new Response("Introuvable", { status: 404 });

  const point = (lat: number | null, lng: number | null, commune: string) => (lat != null && lng != null ? { lat, lng } : getCommune(commune)!);
  const depart = point(c.depart_lat, c.depart_lng, c.commune_depart);
  const arrivee = point(c.arrivee_lat, c.arrivee_lng, c.commune_arrivee);

  // Position du camion seulement pendant la course, et si elle date de moins de 10 min.
  const enRoute = ["acceptee", "enlevee"].includes(c.statut);
  const recente = c.position_le && Date.now() - new Date(c.position_le).getTime() < 10 * 60_000;
  const camion = enRoute && recente && c.position_lat != null ? { lat: c.position_lat, lng: c.position_lng } : null;
  const cible = c.statut === "enlevee" ? arrivee : depart;
  const trajet = camion ? await itineraireRoutier(camion, cible) : null;

  return Response.json(
    { statut: c.statut, depart, arrivee, camion, minutes: trajet?.minutes ?? null, ligne: trajet?.ligne ?? null },
    { headers: { "cache-control": "no-store" } },
  );
}
