import { ArrowRight, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { exigerConnexion } from "@/lib/auth";
import { getCommune } from "@/lib/communes";
import { requete } from "@/lib/db";
import { euros, VEHICULES } from "@/lib/pricing";
import { dateReunion, STATUTS } from "@/lib/statuts";

const nom = (id: string) => getCommune(id)?.nom ?? id;
const EN_COURS = ["attente_paiement", "payee", "acceptee", "enlevee"];

// Mes courses : en cours (avec suivi en direct) puis historique.
export default async function MesCourses() {
  const u = await exigerConnexion("/compte");
  const courses = await requete(
    `select id, reference, jeton_suivi, statut, commune_depart, commune_arrivee, date_enlevement, vehicule, total_cts, description
     from commandes where client_id = $1 order by cree_le desc limit 200`,
    [u.id],
  );
  const enCours = courses.filter((c) => EN_COURS.includes(c.statut));
  const passees = courses.filter((c) => !EN_COURS.includes(c.statut));
  const total = passees.filter((c) => c.statut === "livree").reduce((s, c) => s + c.total_cts, 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="titre text-h3">En cours</h2>
        <Link href="/#reserver" className="bouton h-11"><Plus className="size-4" /> Nouveau transport</Link>
      </div>
      {enCours.length === 0 ? (
        <p className="carte text-gris-500">Aucune course en cours.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {enCours.map((c) => (
            <Link key={c.id} href={`/suivi/${c.jeton_suivi}`} className="carte group space-y-3 transition hover:shadow-flottante">
              <div className="flex items-start justify-between gap-3">
                <span className={`pastille ${STATUTS[c.statut].couleur}`}>{STATUTS[c.statut].libelle}</span>
                <span className="chiffres font-extrabold">{euros(c.total_cts)}</span>
              </div>
              <p className="text-h4 font-extrabold">{nom(c.commune_depart)} → {nom(c.commune_arrivee)}</p>
              <p className="text-petit text-gris-500">{dateReunion(c.date_enlevement)} · {VEHICULES[c.vehicule as keyof typeof VEHICULES].nom}</p>
              <p className="flex items-center gap-1.5 font-bold">
                <MapPin className="size-4" /> {c.statut === "attente_paiement" ? "Finaliser le paiement" : "Suivre en direct"}
                <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="titre text-h3">Historique</h2>
        {total > 0 && <p className="text-petit text-gris-500">Total livré : <strong className="chiffres text-noir">{euros(total)}</strong></p>}
      </div>
      <div className="overflow-hidden rounded-carte bg-blanc shadow-carte">
        <ul className="divide-y divide-gris-100">
          {passees.map((c) => (
            <li key={c.id}>
              <Link href={`/suivi/${c.jeton_suivi}`} className="flex items-center justify-between gap-3 p-4 hover:bg-gris-100">
                <span className="min-w-0">
                  <span className="block font-bold">{nom(c.commune_depart)} → {nom(c.commune_arrivee)}</span>
                  <span className="block truncate text-petit text-gris-500">{c.reference} · {dateReunion(c.date_enlevement)} · {c.description}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="chiffres block font-extrabold">{euros(c.total_cts)}</span>
                  <span className={`pastille ${STATUTS[c.statut].couleur}`}>{STATUTS[c.statut].court}</span>
                </span>
              </Link>
            </li>
          ))}
          {passees.length === 0 && <li className="p-4 text-gris-500">Vos courses terminées apparaîtront ici.</li>}
        </ul>
      </div>
    </>
  );
}
