import { notFound } from "next/navigation";
import { getCommune } from "@/lib/communes";
import { euros } from "@/lib/pricing";
import { dateReunion, ETAPES, STATUTS } from "@/lib/statuts";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Page de suivi publique : accessible uniquement via le jeton secret envoyé au client.
export default async function Suivi({
  params,
  searchParams,
}: {
  params: Promise<{ jeton: string }>;
  searchParams: Promise<{ paye?: string }>;
}) {
  const { jeton } = await params;
  const { paye } = await searchParams;
  if (!/^[a-f0-9]{32}$/.test(jeton)) notFound();

  const { data: c } = await supabaseAdmin()
    .from("commandes")
    .select("*, transporteurs(raison_sociale, vehicule, immatriculation, profils(nom, telephone))")
    .eq("jeton_suivi", jeton)
    .single();
  if (!c) notFound();

  const t = c.transporteurs as
    | { raison_sociale: string; immatriculation: string; profils: { nom: string | null; telephone: string | null } | null }
    | null;
  const statut = STATUTS[c.statut];
  const indexEtape = ETAPES.indexOf(c.statut);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {paye && c.statut === "attente_paiement" && (
        <p className="rounded-lg bg-amber-50 p-3 text-amber-800">
          Paiement en cours de confirmation… actualisez la page dans quelques secondes.
        </p>
      )}
      <div className="carte space-y-2">
        <p className="text-sm text-slate-500">Commande {c.reference}</p>
        <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${statut.couleur}`}>{statut.libelle}</span>
        <ol className="mt-4 grid grid-cols-4 gap-1 text-center text-xs">
          {ETAPES.map((e, i) => (
            <li key={e} className={`rounded-md py-2 ${i <= indexEtape ? "bg-marque text-white" : "bg-slate-100 text-slate-500"}`}>
              {STATUTS[e].libelle}
            </li>
          ))}
        </ol>
      </div>

      {["acceptee", "enlevee"].includes(c.statut) && (
        <div className="carte border-marque bg-teal-50 text-center">
          <p className="text-sm text-slate-700">Code de livraison à donner au transporteur <strong>uniquement à la réception</strong> :</p>
          <p className="mt-1 text-4xl font-bold tracking-[0.3em] text-marque">{c.code_livraison}</p>
        </div>
      )}

      {t && (
        <div className="carte">
          <h2 className="font-semibold">Votre transporteur</h2>
          <p>{t.profils?.nom ?? t.raison_sociale} — {t.raison_sociale}</p>
          <p className="text-sm text-slate-600">Véhicule immatriculé {t.immatriculation}</p>
          {t.profils?.telephone && (
            <a href={`tel:${t.profils.telephone}`} className="bouton mt-3">Appeler {t.profils.telephone}</a>
          )}
        </div>
      )}

      <div className="carte space-y-1 text-sm">
        <p><strong>Enlèvement :</strong> {c.adresse_depart}, {getCommune(c.commune_depart)?.nom} — {dateReunion(c.date_enlevement)}</p>
        <p><strong>Livraison :</strong> {c.adresse_arrivee}, {getCommune(c.commune_arrivee)?.nom}</p>
        <p><strong>Marchandise :</strong> {c.description}</p>
        <p><strong>Total payé :</strong> {euros(c.total_cts)}</p>
      </div>
      <p className="text-center text-xs text-slate-500">Gardez ce lien : il vous permet de suivre votre commande.</p>
    </div>
  );
}
