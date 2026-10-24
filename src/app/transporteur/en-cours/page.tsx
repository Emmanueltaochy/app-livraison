import { ListChecks, Navigation, Package, PackageCheck, Phone } from "lucide-react";
import Link from "next/link";
import { marquerEnlevee } from "@/app/actions/transporteur";
import { euros } from "@/lib/pricing";
import { dateReunion } from "@/lib/statuts";
import { getCommune } from "@/lib/communes";
import { CarteChauffeur } from "../CarteChauffeur";
import { coursesEnCours, exigerTransporteurValide, nomCommune } from "../donnees";
import { FormulaireLivraison } from "../FormulaireLivraison";
import { Titre } from "../Pastille";

const acces = (etage: number, ascenseur: boolean) => (etage > 0 ? ` · ${etage}e étage, ${ascenseur ? "ascenseur" : "sans ascenseur"}` : "");

const itineraire = (adresse: string, commune: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${adresse}, ${nomCommune(commune)}, La Réunion`)}`;

// Onglet « En cours » : chargement puis livraison, étape par étape.
export default async function EnCours() {
  const { t } = await exigerTransporteurValide();
  const courses = await coursesEnCours(t.id);

  return (
    <>
      <Titre>En cours</Titre>
      {courses.length === 0 && (
        <div className="rounded-carte bg-noir-800 p-8 text-center">
          <ListChecks className="mx-auto size-10 text-jaune" />
          <p className="mt-3 text-h4 font-extrabold">Aucune course en cours</p>
          <p className="text-gris-300">Acceptez une course pour la retrouver ici.</p>
          <Link href="/transporteur" className="bouton mt-5 bg-jaune text-noir hover:bg-jaune-survol">
            Voir les courses disponibles
          </Link>
        </div>
      )}
      {courses.map((c) => {
        const charge = c.statut === "enlevee";
        // Cible du moment : le chargement, puis la livraison une fois la marchandise chargée.
        const [lat, lng, commune] = charge ? [c.arrivee_lat, c.arrivee_lng, c.commune_arrivee] : [c.depart_lat, c.depart_lng, c.commune_depart];
        const cible = lat != null && lng != null ? { lat, lng } : getCommune(commune)!;
        const ici = t.position_lat != null && t.position_lng != null ? { lat: t.position_lat, lng: t.position_lng } : undefined;
        return (
          <section key={c.id} aria-label={`Course ${c.reference}`} className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-gris-300">{c.reference}</p>
                <h2 className="titre text-h3">{charge ? "Étape 2 : livraison" : "Étape 1 : chargement"}</h2>
              </div>
              <p className="chiffres large text-h2 font-extrabold text-jaune">{euros(c.remuneration_transporteur_cts)}</p>
            </div>
            <CarteChauffeur
              cibles={[{ id: c.id, point: { lat: cible.lat, lng: cible.lng }, etiquette: charge ? "Livraison" : "Chargement" }]}
              selection={c.id}
              positionInitiale={ici}
              libelleCible={charge ? "point de livraison" : "point de chargement"}
              className="h-[38vh] min-h-60"
            />
            <div className={`rounded-carte p-5 ${charge ? "bg-noir-800" : "bg-blanc text-noir"}`}>
              <p className={`text-petit font-extrabold tracking-wider ${charge ? "text-gris-300" : ""}`}>
                CHARGEMENT · {dateReunion(c.date_enlevement).toUpperCase()}
              </p>
              <p className="mt-1 text-h3 font-extrabold">{c.adresse_depart}</p>
              <p className={charge ? "text-gris-300" : "text-gris-500"}>
                {nomCommune(c.commune_depart)}
                {acces(c.etages_depart, c.ascenseur_depart)}
              </p>
            </div>
            <div className={`rounded-carte p-5 ${charge ? "bg-blanc text-noir" : "bg-noir-800"}`}>
              <p className={`text-petit font-extrabold tracking-wider ${charge ? "" : "text-gris-300"}`}>LIVRAISON · {c.distance_km} KM</p>
              <p className="mt-1 text-h3 font-extrabold">{c.adresse_arrivee}</p>
              <p className={charge ? "text-gris-500" : "text-gris-300"}>
                {nomCommune(c.commune_arrivee)}
                {acces(c.etages_arrivee, c.ascenseur_arrivee)}
              </p>
            </div>
            <div className="flex gap-3 rounded-carte bg-noir-800 p-5">
              <Package className="size-6 shrink-0 text-jaune" />
              <p>
                {c.description}
                <span className="block text-gris-300">
                  {[
                    c.volume_m3 != null && `${Number(c.volume_m3).toLocaleString("fr-FR")} m³ · ${c.poids_kg} kg`,
                    c.personnes > 1 && `${c.personnes} personnes`,
                    c.demontage && "démontage et remontage",
                    c.portage_long && "portage de plus de 30 m",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </p>
            </div>
            <a href={`tel:${c.client_telephone}`} className="flex h-16 items-center justify-center gap-3 rounded-carte border-2 border-blanc text-h4 font-extrabold">
              <Phone className="size-6" /> Appeler {c.client_nom.split(" ")[0]} · {c.client_telephone}
            </a>
            <div className={`grid gap-3 ${charge ? "" : "grid-cols-[1fr_1.4fr]"}`}>
              <a
                href={charge ? itineraire(c.adresse_arrivee, c.commune_arrivee) : itineraire(c.adresse_depart, c.commune_depart)}
                target="_blank"
                rel="noreferrer"
                className="flex h-16 items-center justify-center gap-2 rounded-carte border-2 border-blanc font-extrabold"
              >
                <Navigation className="size-5" /> Itinéraire
              </a>
              {!charge && (
                <form action={marquerEnlevee}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="bouton h-16 w-full rounded-carte text-h4">
                    <PackageCheck className="size-6" /> Marchandise chargée
                  </button>
                </form>
              )}
            </div>
            {charge && <FormulaireLivraison id={c.id} commune={nomCommune(c.commune_arrivee)} />}
          </section>
        );
      })}
    </>
  );
}
