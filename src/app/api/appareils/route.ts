import { z } from "zod";
import { utilisateurCourant } from "@/lib/auth";
import { requete } from "@/lib/db";

const corps = z.object({ jeton: z.string().min(20).max(4096), plateforme: z.enum(["android", "ios", "web"]) });

// Enregistre le jeton de notification du téléphone de l'utilisateur connecté.
export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return new Response("Non connecté", { status: 401 });
  const p = corps.safeParse(await req.json().catch(() => null));
  if (!p.success) return new Response("Jeton invalide", { status: 400 });
  await requete(
    `insert into appareils (jeton, utilisateur_id, plateforme) values ($1, $2, $3)
     on conflict (jeton) do update set utilisateur_id = excluded.utilisateur_id, plateforme = excluded.plateforme, vu_le = now()`,
    [p.data.jeton, u.id, p.data.plateforme],
  );
  return Response.json({ ok: true });
}
