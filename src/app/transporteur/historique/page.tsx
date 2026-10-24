import { requete } from "@/lib/db";
import { euros } from "@/lib/pricing";
import { dateReunion, STATUTS } from "@/lib/statuts";
import { exigerTransporteurValide, nomCommune } from "../donnees";
import { Titre } from "../Pastille";

// Onglet « Historique » : courses terminées et gains.
export default async function Historique() {
  const { t } = await exigerTransporteurValide();
  const [courses, gains] = await Promise.all([
    requete(
      `select id, reference, commune_depart, commune_arrivee, date_enlevement, statut, remuneration_transporteur_cts
       from commandes where transporteur_id = $1 and statut not in ('acceptee', 'enlevee')
       order by date_enlevement desc limit 100`,
      [t.id],
    ),
    requete<{ total: string; mois: string; nombre: string }>(
      `select coalesce(sum(remuneration_transporteur_cts), 0) as total,
              coalesce(sum(remuneration_transporteur_cts) filter (
                where date_trunc('month', livree_le at time zone 'Indian/Reunion') = date_trunc('month', now() at time zone 'Indian/Reunion')), 0) as mois,
              count(*) as nombre
       from commandes where transporteur_id = $1 and statut = 'livree'`,
      [t.id],
    ),
  ]);
  const g = gains[0];

  return (
    <>
      <Titre>Historique</Titre>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Ce mois-ci", euros(Number(g.mois))],
          ["Total gagné", euros(Number(g.total))],
          ["Livraisons", g.nombre],
        ].map(([libelle, valeur]) => (
          <div key={libelle} className="rounded-carte bg-noir-800 p-4">
            <p className="text-petit text-gris-300">{libelle}</p>
            <p className="chiffres text-h4 font-extrabold text-jaune">{valeur}</p>
          </div>
        ))}
      </div>
      <ul className="divide-y divide-noir-700 rounded-carte bg-noir-800">
        {courses.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 p-4">
            <span>
              <span className="block font-bold">{nomCommune(c.commune_depart)} → {nomCommune(c.commune_arrivee)}</span>
              <span className="text-petit text-gris-300">{c.reference} · {dateReunion(c.date_enlevement)}</span>
            </span>
            <span className="text-right">
              <span className="chiffres block font-extrabold">{euros(c.remuneration_transporteur_cts)}</span>
              <span className={`pastille ${STATUTS[c.statut].couleur}`}>{STATUTS[c.statut].court}</span>
            </span>
          </li>
        ))}
        {courses.length === 0 && <li className="p-4 text-gris-300">Aucune course terminée pour l&apos;instant.</li>}
      </ul>
    </>
  );
}
