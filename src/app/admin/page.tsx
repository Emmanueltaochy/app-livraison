import { annulerCommande, changerStatutTransporteur, relancerVirement } from "@/app/actions/admin";
import { getCommune } from "@/lib/communes";
import { euros, VEHICULES } from "@/lib/pricing";
import { dateReunion, STATUTS } from "@/lib/statuts";
import { exigerAdmin } from "@/lib/auth";
import { requete } from "@/lib/db";

export const dynamic = "force-dynamic";

const nomCommune = (id: string) => getCommune(id)?.nom ?? id;

export default async function Admin() {
  await exigerAdmin();
  const [commandes, transporteurs, mois] = await Promise.all([
    requete("select * from commandes order by cree_le desc limit 100"),
    requete(
      `select t.*, u.nom, u.telephone, u.email from transporteurs t join utilisateurs u on u.id = t.id
       order by t.cree_le desc`,
    ),
    // Mois calendaire en heure de La Réunion.
    requete(
      `select total_cts, commission_cts, frais_service_cts from commandes
       where statut <> 'annulee'
         and payee_le >= date_trunc('month', now() at time zone 'Indian/Reunion') at time zone 'Indian/Reunion'`,
    ),
  ]);

  const volumeCts = mois.reduce((s, c) => s + c.total_cts, 0);
  const margeCts = mois.reduce((s, c) => s + c.commission_cts + c.frais_service_cts, 0);
  const aValider = transporteurs.filter((t) => t.statut === "en_attente");
  const enAttente = commandes.filter((c) => c.statut === "payee");

  const indicateurs = [
    { libelle: "Volume payé ce mois", valeur: euros(volumeCts) },
    { libelle: "Marge plateforme ce mois", valeur: euros(margeCts) },
    { libelle: "Courses ce mois", valeur: String(mois.length) },
    { libelle: "Sans transporteur", valeur: String(enAttente.length) },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Administration</h1>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {indicateurs.map((i) => (
          <div key={i.libelle} className="carte">
            <p className="text-sm text-slate-500">{i.libelle}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{i.valeur}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Transporteurs à valider ({aValider.length})</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {aValider.map((t) => (
            <article key={t.id} className="carte space-y-1 text-sm">
              <p className="font-semibold">{t.nom} — {t.raison_sociale}</p>
              <p>📞 {t.telephone} · {t.email}</p>
              <p>SIRET {t.siret} · Registre {t.numero_registre_transport}</p>
              <p>Assurance : {t.assurance_marchandises}</p>
              <p>{VEHICULES[t.vehicule as keyof typeof VEHICULES].nom} · {t.immatriculation}</p>
              <div className="flex gap-2 pt-2">
                {(["valide", "refuse"] as const).map((statut) => (
                  <form key={statut} action={changerStatutTransporteur}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="statut" value={statut} />
                    <button className={statut === "valide" ? "bouton" : "bouton-secondaire"}>{statut === "valide" ? "Valider" : "Refuser"}</button>
                  </form>
                ))}
              </div>
            </article>
          ))}
          {aValider.length === 0 && <p className="text-slate-500">Aucun dossier en attente.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Dernières commandes</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Réf.</th>
                <th className="p-3">Trajet</th>
                <th className="p-3">Enlèvement</th>
                <th className="p-3">Client</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Marge</th>
                <th className="p-3">Statut</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {commandes.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 font-mono">{c.reference}</td>
                  <td className="p-3">{nomCommune(c.commune_depart)} → {nomCommune(c.commune_arrivee)}</td>
                  <td className="p-3 whitespace-nowrap">{dateReunion(c.date_enlevement)}</td>
                  <td className="p-3">{c.client_nom}<br /><span className="text-slate-500">{c.client_telephone}</span></td>
                  <td className="p-3 text-right tabular-nums">{euros(c.total_cts)}</td>
                  <td className="p-3 text-right tabular-nums">{euros(c.commission_cts + c.frais_service_cts)}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUTS[c.statut].couleur}`}>{STATUTS[c.statut].libelle}</span></td>
                  <td className="p-3">
                    {["attente_paiement", "payee", "acceptee"].includes(c.statut) && (
                      <form action={annulerCommande}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="text-red-600 underline">Annuler</button>
                      </form>
                    )}
                    {c.statut === "livree" && !c.stripe_transfer_id && (
                      <form action={relancerVirement}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="text-marque underline">Verser au transporteur</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
