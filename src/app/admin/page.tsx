import { AlertTriangle, Percent, Route, Wallet } from "lucide-react";
import Link from "next/link";
import { annulerCommande, changerStatutTransporteur, relancerVirement } from "@/app/actions/admin";
import { exigerAdmin } from "@/lib/auth";
import { getCommune } from "@/lib/communes";
import { requete } from "@/lib/db";
import { euros, VEHICULES } from "@/lib/pricing";
import { STATUTS } from "@/lib/statuts";

export const dynamic = "force-dynamic";

const nomCommune = (id: string) => getCommune(id)?.nom ?? id;
const FILTRES = [
  { id: "", libelle: "Toutes" },
  { id: "payee", libelle: "Recherche" },
  { id: "acceptee", libelle: "En route" },
  { id: "enlevee", libelle: "Chargée" },
  { id: "livree", libelle: "Livrée" },
];
const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .map((m) => m[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const dateCourte = (d: Date) =>
  new Date(d).toLocaleString("fr-FR", { timeZone: "Indian/Reunion", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Admin({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  await exigerAdmin();
  const { statut } = await searchParams;
  const filtre = FILTRES.some((f) => f.id === statut) ? statut : "";

  const [commandes, aValider, [mois]] = await Promise.all([
    requete(
      `select c.*, u.nom as transporteur_nom from commandes c left join utilisateurs u on u.id = c.transporteur_id
       where ($1 = '' or c.statut::text = $1)
       order by c.cree_le desc limit 100`,
      [filtre],
    ),
    requete(
      `select t.*, u.nom, u.telephone, u.email from transporteurs t join utilisateurs u on u.id = t.id
       where t.statut = 'en_attente' order by t.cree_le`,
    ),
    // Mois calendaire en heure de La Réunion.
    requete(
      `select coalesce(sum(total_cts), 0)::int as volume, coalesce(sum(commission_cts + frais_service_cts), 0)::int as marge,
              count(*)::int as courses,
              (select count(*)::int from commandes where statut = 'payee') as sans_transporteur
       from commandes
       where statut <> 'annulee'
         and payee_le >= date_trunc('month', now() at time zone 'Indian/Reunion') at time zone 'Indian/Reunion'`,
    ),
  ]);

  const nomMois = new Date().toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", month: "long" });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <p className="text-petit text-gris-500">
          {new Date().toLocaleDateString("fr-FR", { timeZone: "Indian/Reunion", weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h1 className="titre text-h2 sm:text-h1">Tableau de bord</h1>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-carte bg-noir p-5 text-blanc">
          <p className="flex items-center gap-2 text-petit font-bold"><Wallet className="size-4" /> Volume payé · {nomMois}</p>
          <p className="chiffres large mt-2 text-h2 font-extrabold">{euros(mois.volume)}</p>
        </div>
        <div className="carte">
          <p className="flex items-center gap-2 text-petit font-bold"><Percent className="size-4" /> Marge plateforme</p>
          <p className="chiffres large mt-2 text-h2 font-extrabold">{euros(mois.marge)}</p>
          {mois.volume > 0 && <p className="text-petit font-bold text-succes">{Math.round((mois.marge / mois.volume) * 100)} % du volume</p>}
        </div>
        <div className="carte">
          <p className="flex items-center gap-2 text-petit font-bold"><Route className="size-4" /> Courses</p>
          <p className="chiffres large mt-2 text-h2 font-extrabold">{mois.courses}</p>
        </div>
        <div className={`rounded-carte p-5 ${mois.sans_transporteur > 0 ? "bg-alerte-clair" : "bg-blanc shadow-carte"}`}>
          <p className="flex items-center gap-2 text-petit font-bold"><AlertTriangle className="size-4" /> Sans transporteur</p>
          <p className="chiffres large mt-2 text-h2 font-extrabold">{mois.sans_transporteur}</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-h3 font-extrabold">
          Dossiers transporteurs à valider
          <span className="pastille bg-jaune text-noir">{aValider.length}</span>
        </h2>
        {aValider.length === 0 && <p className="text-gris-500">Aucun dossier en attente.</p>}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {aValider.map((t) => (
            <article key={t.id} className="carte space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-pastille bg-noir font-extrabold text-jaune">{initiales(t.nom ?? t.raison_sociale)}</span>
                <div>
                  <p className="font-extrabold">{t.nom}</p>
                  <p className="text-petit text-gris-500">{t.raison_sociale}</p>
                </div>
              </div>
              <dl className="space-y-1 text-petit">
                {[
                  ["Véhicule", `${VEHICULES[t.vehicule as keyof typeof VEHICULES].nom} · ${t.immatriculation}`],
                  ["SIRET", t.siret],
                  ["Registre", t.numero_registre_transport],
                  ["Assurance", t.assurance_marchandises],
                  ["Contact", `${t.telephone} · ${t.email}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-gris-500">{k}</dt>
                    <dd className="chiffres text-right font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="grid grid-cols-2 gap-2">
                {(["refuse", "valide"] as const).map((s) => (
                  <form key={s} action={changerStatutTransporteur}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="statut" value={s} />
                    <button className={s === "valide" ? "bouton h-12 w-full" : "bouton-danger w-full"}>{s === "valide" ? "Valider" : "Refuser"}</button>
                  </form>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h3 font-extrabold">Commandes</h2>
          <nav className="flex flex-wrap gap-2" aria-label="Filtrer par statut">
            {FILTRES.map((f) => (
              <Link
                key={f.id}
                href={f.id ? `/admin?statut=${f.id}` : "/admin"}
                className={`rounded-pastille border-2 px-3 py-1 text-petit font-bold ${filtre === f.id ? "border-noir bg-jaune" : "border-gris-300 bg-blanc hover:border-noir"}`}
              >
                {f.libelle}
              </Link>
            ))}
          </nav>
        </div>
        <div className="overflow-x-auto rounded-carte bg-blanc shadow-carte">
          <table className="w-full min-w-[900px] text-left text-petit">
            <thead className="border-b border-gris-100 text-gris-500">
              <tr>
                {["Référence", "Client", "Trajet", "Véhicule", "Enlèvement", "Transporteur", "TTC", "Marge", "Statut", ""].map((h) => (
                  <th key={h} className={`p-3 font-bold ${h === "TTC" || h === "Marge" ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gris-100">
              {commandes.map((c) => (
                <tr key={c.id} className={c.statut === "payee" ? "bg-jaune-clair/40" : ""}>
                  <td className="chiffres p-3 font-extrabold">{c.reference}</td>
                  <td className="p-3">{c.client_nom}<br /><span className="text-gris-500">{c.client_telephone}</span></td>
                  <td className="p-3">{nomCommune(c.commune_depart)} → {nomCommune(c.commune_arrivee)}</td>
                  <td className="p-3">{VEHICULES[c.vehicule as keyof typeof VEHICULES].nom}</td>
                  <td className="chiffres p-3 whitespace-nowrap">{dateCourte(c.date_enlevement)}</td>
                  <td className={`p-3 ${c.transporteur_nom ? "" : "font-bold text-alerte"}`}>{c.transporteur_nom ?? (c.statut === "payee" ? "Aucun" : "—")}</td>
                  <td className="chiffres p-3 text-right font-extrabold whitespace-nowrap">{euros(c.total_cts)}</td>
                  <td className="chiffres p-3 text-right whitespace-nowrap">{euros(c.commission_cts + c.frais_service_cts)}</td>
                  <td className="p-3"><span className={`pastille whitespace-nowrap ${STATUTS[c.statut].couleur}`}>{STATUTS[c.statut].court}</span></td>
                  <td className="p-3">
                    {["attente_paiement", "payee", "acceptee"].includes(c.statut) && (
                      <form action={annulerCommande}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="font-bold text-erreur underline">Annuler</button>
                      </form>
                    )}
                    {c.statut === "livree" && !c.stripe_transfer_id && (
                      <form action={relancerVirement}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="font-bold whitespace-nowrap underline">Verser au transporteur</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {commandes.length === 0 && (
                <tr><td colSpan={10} className="p-6 text-center text-gris-500">Aucune commande.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
