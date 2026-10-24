import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getCommune } from "@/lib/communes";
import { une } from "@/lib/db";
import type Stripe from "stripe";
import { type CommandeAPayer, confirmerPaiement, creerSessionPaiement } from "@/lib/paiement";
import { euros } from "@/lib/pricing";
import { clePublique, stripe, stripeConfigure } from "@/lib/stripe";
import { dateReunion } from "@/lib/statuts";
import { PaiementIntegre } from "./PaiementIntegre";

export const dynamic = "force-dynamic";

// Paiement sur la plateforme : la session Stripe ouverte est reprise, ou recréée si elle a expiré.
export default async function Paiement({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  if (!/^[a-f0-9]{32}$/.test(jeton)) notFound();
  const c = await une<CommandeAPayer & { statut: string; stripe_session_id: string | null; description: string; total_cts: number; date_enlevement: string }>(
    "select * from commandes where jeton_suivi = $1",
    [jeton],
  );
  if (!c) notFound();
  const cle = clePublique();
  if (c.statut !== "attente_paiement" || !cle || !stripeConfigure()) redirect(`/suivi/${jeton}`);

  let session: Stripe.Checkout.Session | null = c.stripe_session_id ? await stripe().checkout.sessions.retrieve(c.stripe_session_id).catch(() => null) : null;
  if (session?.status === "complete") {
    await confirmerPaiement(session);
    redirect(`/suivi/${jeton}`);
  }
  const depart = getCommune(c.commune_depart)?.nom;
  const arrivee = getCommune(c.commune_arrivee)?.nom;
  if (!session || session.status !== "open" || !session.client_secret || session.ui_mode !== "embedded_page") {
    session = await creerSessionPaiement(c, true, `${depart} → ${arrivee}`);
  }

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <h1 className="titre flex items-center gap-3 text-h2"><Lock className="size-7" /> Paiement sécurisé</h1>
        <PaiementIntegre clePublique={cle} clientSecret={session!.client_secret!} />
      </div>
      <aside className="overflow-hidden rounded-carte bg-blanc shadow-flottante lg:sticky lg:top-24">
        <div className="bg-noir px-6 py-5 text-blanc">
          <p className="text-petit font-extrabold tracking-widest text-jaune">VOTRE COMMANDE {c.reference}</p>
          <p className="mt-1 flex items-center gap-2 text-h4 font-extrabold">{depart} <ArrowRight className="size-5" /> {arrivee}</p>
          <p className="text-petit text-gris-300">{dateReunion(c.date_enlevement)}</p>
        </div>
        <div className="space-y-3 p-6 text-petit">
          <p className="text-gris-700">{c.description}</p>
          <div className="flex items-end justify-between border-t-2 border-dashed border-gris-300 pt-3">
            <span className="font-bold">Total TTC</span>
            <span className="chiffres large text-prix font-extrabold">{euros(c.total_cts)}</span>
          </div>
          <p className="flex items-center gap-2 text-gris-500"><ShieldCheck className="size-4" /> Le transporteur n&apos;est payé qu&apos;après la livraison confirmée par votre code.</p>
        </div>
      </aside>
    </div>
  );
}
