import "server-only";
import { getCommune } from "./communes";
import { requete, une } from "./db";
import { choisirTransporteurs, type Candidat } from "./dispatch";
import { envoyerPush } from "./notifications";
import { euros, type VehiculeId } from "./pricing";
import { urlSite } from "./stripe";

// Prévient par notification les transporteurs concernés par une commande qui vient d'être payée.
// Ne doit jamais faire échouer le paiement : les erreurs sont seulement journalisées.
export async function notifierNouvelleCourse(commandeId: string): Promise<void> {
  try {
    const c = await une<{
      vehicule: VehiculeId;
      mode: "maintenant" | "programme";
      depart_lat: number | null;
      depart_lng: number | null;
      commune_depart: string;
      commune_arrivee: string;
      remuneration_transporteur_cts: number;
    }>(
      `select vehicule, mode, depart_lat, depart_lng, commune_depart, commune_arrivee, remuneration_transporteur_cts
       from commandes where id = $1 and statut = 'payee'`,
      [commandeId],
    );
    if (!c) return;

    const lignes = await requete<{ id: string; vehicule: VehiculeId; en_ligne: boolean; position_lat: number | null; position_lng: number | null; position_le: Date | null }>(
      `select id, vehicule, en_ligne, position_lat, position_lng, position_le from transporteurs
       where statut = 'valide' and exists (select 1 from appareils a where a.utilisateur_id = transporteurs.id)`,
    );
    const candidats: Candidat[] = lignes.map((t) => ({
      id: t.id,
      vehicule: t.vehicule,
      en_ligne: t.en_ligne,
      position: t.position_lat !== null && t.position_lng !== null ? { lat: t.position_lat, lng: t.position_lng } : undefined,
      position_le: t.position_le ?? undefined,
    }));
    const depart = c.depart_lat !== null && c.depart_lng !== null ? { lat: c.depart_lat, lng: c.depart_lng } : undefined;
    const ids = choisirTransporteurs(candidats, { vehicule: c.vehicule, mode: c.mode, depart });
    if (ids.length === 0) return;

    const jetons = await requete<{ jeton: string }>("select jeton from appareils where utilisateur_id = any($1::uuid[])", [ids]);
    const trajet = `${getCommune(c.commune_depart)?.nom} → ${getCommune(c.commune_arrivee)?.nom}`;
    await envoyerPush(
      jetons.map((j) => j.jeton),
      {
        titre: c.mode === "maintenant" ? `Course immédiate · ${euros(c.remuneration_transporteur_cts)}` : `Nouvelle course · ${euros(c.remuneration_transporteur_cts)}`,
        corps: trajet,
        lien: `${urlSite()}/transporteur`,
      },
    );
  } catch (e) {
    console.error("notifierNouvelleCourse", commandeId, e);
  }
}
