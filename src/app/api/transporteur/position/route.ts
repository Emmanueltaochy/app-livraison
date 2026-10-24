import { z } from "zod";
import { utilisateurCourant } from "@/lib/auth";
import { estSurLIle } from "@/lib/communes";
import { requete, une } from "@/lib/db";

const corps = z.object({ lat: z.number().finite(), lng: z.number().finite() });
// Pendant une course, on garde au plus un point toutes les 10 s pour le suivi client.
const INTERVALLE_TRACE_S = 10;

// Reçoit la position GPS du transporteur connecté (app native ou navigateur).
export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return new Response("Non connecté", { status: 401 });
  const p = corps.safeParse(await req.json().catch(() => null));
  if (!p.success || !estSurLIle(p.data)) return new Response("Position invalide", { status: 400 });
  const { lat, lng } = p.data;

  const t = await une<{ id: string }>(
    `update transporteurs set position_lat = $2, position_lng = $3, position_le = now()
     where id = $1 and statut = 'valide' returning id`,
    [u.id, lat, lng],
  );
  if (!t) return new Response("Transporteur non validé", { status: 403 });

  await requete(
    `insert into positions_course (commande_id, lat, lng)
     select c.id, $2, $3 from commandes c
     where c.transporteur_id = $1 and c.statut in ('acceptee', 'enlevee')
       and not exists (
         select 1 from positions_course p
         where p.commande_id = c.id and p.enregistree_le > now() - make_interval(secs => $4)
       )`,
    [u.id, lat, lng, INTERVALLE_TRACE_S],
  );
  return Response.json({ ok: true });
}
