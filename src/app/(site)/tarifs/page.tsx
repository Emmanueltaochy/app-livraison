import type { Metadata } from "next";
import { Check } from "lucide-react";
import { AppelReserver, Contenu, EnTetePage } from "@/components/site/Page";
import { decrire, type Inventaire } from "@/lib/inventaire";
import { calculerDevis, euros, TARIFS, VEHICULES, type VehiculeId } from "@/lib/pricing";

export const metadata: Metadata = { title: "Tarifs — FretPéi" };

// Exemples calculés avec le vrai moteur de prix : ils restent justes quand les tarifs changent.
const EXEMPLES: { titre: string; depart: string; arrivee: string; vehicule: VehiculeId; inventaire: Inventaire; personnes: number; etage?: number }[] = [
  { titre: "Un achat Leboncoin", depart: "saint-denis", arrivee: "sainte-marie", vehicule: "petit", inventaire: { commode: 1, carton: 3 }, personnes: 1 },
  { titre: "Un réfrigérateur livré au 2e", depart: "le-port", arrivee: "saint-paul", vehicule: "petit", inventaire: { frigo: 1 }, personnes: 2, etage: 2 },
  { titre: "Un canapé et un buffet", depart: "saint-pierre", arrivee: "le-tampon", vehicule: "moyen", inventaire: { canape_3: 1, buffet: 1 }, personnes: 2 },
  { titre: "Un studio", depart: "saint-denis", arrivee: "saint-pierre", vehicule: "moyen", inventaire: { lit_double: 1, armoire_2: 1, canape_2: 1, table: 1, chaise: 2, frigo: 1, lave_linge: 1, micro_ondes: 1, television: 1, carton: 15 }, personnes: 2 },
  { titre: "2 palettes de matériaux", depart: "le-port", arrivee: "saint-andre", vehicule: "grand", inventaire: { palette: 2 }, personnes: 1 },
];

// Mardi 10 h, hors heure de pointe.
const DATE_EXEMPLE = new Date("2026-11-10T06:00:00Z");

export default function Tarifs() {
  return (
    <>
      <EnTetePage surtitre="Tarifs" titre="Un prix fixe, calculé avant de réserver." texte="Le prix dépend du trajet, du véhicule, du temps de manutention et de l'équipe. Il s'affiche en direct dans le formulaire, avant de payer." />
      <Contenu>
        <section className="space-y-5">
          <h2 className="titre text-h2">Les véhicules</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {(Object.keys(VEHICULES) as VehiculeId[]).map((id) => {
              const v = VEHICULES[id];
              return (
                <div key={id} className="carte space-y-3">
                  <h3 className="text-h4 font-extrabold">{v.nom}</h3>
                  <p className="text-petit text-gris-500">{v.description}</p>
                  <p className="chiffres text-h2 font-extrabold">dès {euros(v.minimumCts)}</p>
                  <ul className="space-y-1.5 text-petit">
                    <li className="flex gap-2"><Check className="size-4 shrink-0" /> {v.charge}{v.hayon ? " · hayon élévateur" : ""}</li>
                    <li className="flex gap-2"><Check className="size-4 shrink-0" /> {euros(v.baseCts)} de prise en charge + {euros(v.parKmCts)} / km</li>
                    <li className="flex gap-2"><Check className="size-4 shrink-0" /> Chauffeur et {v.minutesIncluses} min de manutention inclus</li>
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="titre text-h2">Options et majorations</h2>
          <div className="carte overflow-x-auto p-0">
            <table className="w-full text-left text-petit">
              <tbody className="divide-y divide-gris-100">
                {[
                  ["Manutention au-delà du temps inclus", `${euros(TARIFS.minuteManutentionCts * 60)} / heure`],
                  ["Personne en plus du chauffeur", `${euros(TARIFS.personneSupplementaireCts)} par personne`],
                  ["Étage sans ascenseur", `+${Math.round(TARIFS.etageSansAscenseurTaux * 100)} % de manutention par étage`],
                  ["Camion à plus de 30 m de la porte", `+${Math.round(TARIFS.portageLongTaux * 100)} % de manutention`],
                  ["Démontage et remontage", "au temps passé"],
                  ["Express (prise en charge dans l'heure)", `+${Math.round(TARIFS.expressTaux * 100)} % du trajet`],
                  ["Heure de pointe (lun.–ven. 6 h 30–8 h 30, 15 h 30–18 h 30)", `+${Math.round(TARIFS.heurePointeTaux * 100)} % du trajet`],
                  ["Dimanche et jour férié", `+${Math.round(TARIFS.dimancheFerieTaux * 100)} %`],
                  ["Assurance renforcée (biens de valeur)", euros(TARIFS.assuranceRenforceeCts)],
                  ["Frais de service", euros(TARIFS.fraisServiceCts)],
                ].map(([l, p]) => (
                  <tr key={l}>
                    <td className="p-4">{l}</td>
                    <td className="chiffres p-4 text-right font-extrabold whitespace-nowrap">{p}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="titre text-h2">Exemples de prix</h2>
          <p className="text-gris-500">Calculés un mardi à 10 h, hors heure de pointe, prix TTC frais de service compris.</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {EXEMPLES.map((e) => {
              const d = calculerDevis({ ...e, accesArrivee: { etage: e.etage ?? 0 }, dateEnlevement: DATE_EXEMPLE });
              return (
                <div key={e.titre} className="carte space-y-2">
                  <h3 className="text-h4 font-extrabold">{e.titre}</h3>
                  <p className="text-petit text-gris-500">{decrire(e.inventaire)}</p>
                  <p className="text-petit">{VEHICULES[e.vehicule].nom} · {d.distanceKm} km · {e.personnes} pers.</p>
                  <p className="chiffres large text-h2 font-extrabold">{euros(d.totalCts)}</p>
                </div>
              );
            })}
          </div>
        </section>
        <AppelReserver titre="Votre prix exact en 2 minutes" />
      </Contenu>
    </>
  );
}
