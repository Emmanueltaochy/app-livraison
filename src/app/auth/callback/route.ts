import { NextResponse, type NextRequest } from "next/server";
import { supabaseSession } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const retour = req.nextUrl.searchParams.get("retour") ?? "/";
  const destination = retour.startsWith("/") && !retour.startsWith("//") ? retour : "/";
  if (code) {
    const sb = await supabaseSession();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, req.url));
  }
  return NextResponse.redirect(new URL("/connexion?erreur=1", req.url));
}
