import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Transporteur } from "@/app/actions/transporteur";
import { exigerConnexion } from "@/lib/auth";
import { getCommune } from "@/lib/communes";
import { requete, une } from "@/lib/db";

// Lu une seule fois par requête, partagé entre la mise en page et l'onglet affiché.
export const chargerTransporteur = cache(async () => {
  const u = await exigerConnexion("/transporteur");
  const t = await une<Transporteur>("select * from transporteurs where id = $1", [u.id]);
  return { u, t };
});

// Les onglets (en cours, historique, compte) n'existent que pour un transporteur validé.
export async function exigerTransporteurValide() {
  const { u, t } = await chargerTransporteur();
  if (!t || t.statut !== "valide") redirect("/transporteur");
  return { u, t };
}

export const coursesEnCours = cache((id: string) =>
  requete("select * from commandes where transporteur_id = $1 and statut in ('acceptee', 'enlevee') order by date_enlevement", [id]),
);

export const nomCommune = (id: string) => getCommune(id)?.nom ?? id;
