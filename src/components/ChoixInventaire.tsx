"use client";

import { Building2, ChevronDown, Hammer, Minus, Package, Plus, Sofa, Store } from "lucide-react";
import { useState } from "react";
import {
  CATEGORIES,
  CATEGORIES_PAR_TYPE,
  LOGEMENTS_TYPES,
  OBJETS,
  resumer,
  TYPES_TRANSPORT,
  type Categorie,
  type Inventaire,
  type ObjetId,
  type TypeTransport,
} from "@/lib/inventaire";

const ICONES: Record<TypeTransport, typeof Sofa> = { objets: Sofa, magasin: Store, demenagement: Building2, materiaux: Hammer };
const nombre = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

function Compteur({ id, qte, onChange }: { id: ObjetId; qte: number; onChange: (id: ObjetId, q: number) => void }) {
  const o = OBJETS[id];
  return (
    <li className={`flex items-center gap-3 rounded-bouton px-3 py-2 ${qte ? "bg-jaune-clair" : ""}`}>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{o.nom}</span>
        <span className="block text-[0.8rem] text-gris-500">
          {nombre(o.volume)} m³ · {o.poids} kg{"lourd" in o && o.lourd ? " · 2 personnes" : ""}
        </span>
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Retirer : ${o.nom}`}
          disabled={!qte}
          onClick={() => onChange(id, qte - 1)}
          className="flex size-9 items-center justify-center rounded-pastille border-2 border-noir disabled:border-gris-100 disabled:text-gris-300"
        >
          <Minus className="size-4" strokeWidth={3} />
        </button>
        <span className="chiffres w-7 text-center font-extrabold" aria-live="polite">{qte}</span>
        <button
          type="button"
          aria-label={`Ajouter : ${o.nom}`}
          onClick={() => onChange(id, qte + 1)}
          className="flex size-9 items-center justify-center rounded-pastille bg-noir text-blanc"
        >
          <Plus className="size-4" strokeWidth={3} />
        </button>
      </span>
    </li>
  );
}

// Étape « Quoi ? » : type de transport puis inventaire (volume et poids calculés au fur et à mesure).
export function ChoixInventaire(props: {
  type: TypeTransport;
  onType: (t: TypeTransport) => void;
  inventaire: Inventaire;
  onInventaire: (i: Inventaire) => void;
}) {
  const categories = CATEGORIES_PAR_TYPE[props.type];
  const [ouverte, setOuverte] = useState<Categorie | null>(categories[0]);
  const r = resumer(props.inventaire);

  const changer = (id: ObjetId, q: number) => {
    const suivant = { ...props.inventaire };
    if (q <= 0) delete suivant[id];
    else suivant[id] = Math.min(q, 200);
    props.onInventaire(suivant);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(TYPES_TRANSPORT) as TypeTransport[]).map((t) => {
          const Icone = ICONES[t];
          const actif = props.type === t;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={actif}
              onClick={() => {
                props.onType(t);
                setOuverte(CATEGORIES_PAR_TYPE[t][0]);
              }}
              className={`flex flex-col items-start gap-2 rounded-carte border-2 p-3 text-left transition sm:p-4 ${actif ? "border-noir bg-jaune-clair" : "border-gris-100 hover:border-gris-300"}`}
            >
              <span className={`flex size-10 items-center justify-center rounded-bouton ${actif ? "bg-jaune" : "bg-gris-100"}`}>
                <Icone className="size-5" />
              </span>
              <span className="font-extrabold leading-tight">{TYPES_TRANSPORT[t].nom}</span>
              <span className="text-[0.8rem] leading-snug text-gris-500">{TYPES_TRANSPORT[t].detail}</span>
            </button>
          );
        })}
      </div>

      {props.type === "demenagement" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-petit font-bold">Partir d&apos;un logement type :</span>
          {LOGEMENTS_TYPES.map((l) => (
            <button key={l.nom} type="button" onClick={() => props.onInventaire({ ...l.inventaire })} className="rounded-pastille border-2 border-noir px-3 py-1 text-petit font-bold hover:bg-jaune-clair">
              {l.nom}
            </button>
          ))}
        </div>
      )}

      <div>
        <p className="etiquette">Que transportez-vous ?</p>
        <div className="divide-y divide-gris-100 rounded-carte border-2 border-gris-100">
          {categories.map((c) => {
            const ids = (Object.keys(OBJETS) as ObjetId[]).filter((id) => OBJETS[id].categorie === c);
            const dansCategorie = ids.reduce((s, id) => s + (props.inventaire[id] ?? 0), 0);
            const visible = ouverte === c;
            return (
              <div key={c}>
                <button
                  type="button"
                  aria-expanded={visible}
                  onClick={() => setOuverte(visible ? null : c)}
                  className="flex w-full items-center justify-between px-4 py-3 font-extrabold"
                >
                  <span>
                    {CATEGORIES[c]}
                    {dansCategorie > 0 && <span className="ml-2 rounded-pastille bg-jaune px-2 py-0.5 text-[0.8rem]">{dansCategorie}</span>}
                  </span>
                  <ChevronDown className={`size-5 transition-transform ${visible ? "rotate-180" : ""}`} />
                </button>
                {visible && <ul className="space-y-1 px-1 pb-3">{ids.map((id) => <Compteur key={id} id={id} qte={props.inventaire[id] ?? 0} onChange={changer} />)}</ul>}
              </div>
            );
          })}
        </div>
      </div>

      <p className={`flex items-center gap-2 rounded-bouton p-3 text-petit font-bold ${r.nombre ? "bg-noir text-blanc" : "bg-gris-100 text-gris-500"}`}>
        <Package className="size-5 shrink-0" />
        {r.nombre
          ? `${r.nombre} objet${r.nombre > 1 ? "s" : ""} · ${nombre(r.volume)} m³ · ${nombre(r.poids)} kg`
          : "Ajoutez vos objets : le volume, le poids et le bon véhicule sont calculés pour vous."}
      </p>
    </div>
  );
}
