import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function env(nom: string): string {
  const v = process.env[nom];
  if (!v) throw new Error(`Variable d'environnement manquante : ${nom} (voir README)`);
  return v;
}

// Client lié à la session de l'utilisateur (soumis au RLS).
export async function supabaseSession() {
  const store = await cookies();
  return createServerClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (aEcrire) => {
        try {
          aEcrire.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : le middleware rafraîchit la session.
        }
      },
    },
  });
}

// Client serveur privilégié (contourne le RLS). Ne jamais l'exposer au navigateur.
export function supabaseAdmin() {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

export type Profil = { id: string; role: "client" | "transporteur" | "admin"; nom: string | null };

export async function utilisateurCourant(): Promise<{ id: string; email: string; profil: Profil } | null> {
  const sb = await supabaseSession();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabaseAdmin().from("profils").select("id, role, nom").eq("id", user.id).single();
  if (!profil) return null;
  return { id: user.id, email: user.email ?? "", profil: profil as Profil };
}

export async function exigerConnexion(retour: string) {
  const u = await utilisateurCourant();
  if (!u) redirect(`/connexion?retour=${encodeURIComponent(retour)}`);
  return u;
}

export async function exigerAdmin() {
  const u = await exigerConnexion("/admin");
  if (u.profil.role !== "admin") redirect("/");
  return u;
}
