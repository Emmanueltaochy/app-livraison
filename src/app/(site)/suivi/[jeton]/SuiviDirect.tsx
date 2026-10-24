"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as CarteMapLibre, Marker } from "maplibre-gl";
import { Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Point } from "@/lib/communes";

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const INTERVALLE_MS = 8000;

type Etat = { statut: string; depart: Point; arrivee: Point; camion: Point | null; minutes: number | null; ligne: [number, number][] | null };

function element(classe: string, texte = "") {
  const el = document.createElement("div");
  el.className = classe;
  el.textContent = texte;
  return el;
}

// Suivi en direct : interroge le serveur toutes les 8 s, recharge la page quand le statut change
// (transporteur trouvé, marchandise chargée, livrée) et montre le camion qui avance sur la carte.
export function SuiviDirect({ jeton, statutInitial }: { jeton: string; statutInitial: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat | null>(null);
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteMapLibre | null>(null);
  const marqueurs = useRef<{ depart?: Marker; arrivee?: Marker; camion?: Marker }>({});
  const [prete, setPrete] = useState(false);
  const cadre = useRef(false);

  useEffect(() => {
    let actif = true;
    const lire = async () => {
      const r = await fetch(`/api/suivi/${jeton}`, { cache: "no-store" }).catch(() => null);
      if (!actif || !r?.ok) return;
      const e: Etat = await r.json();
      setEtat(e);
      if (e.statut !== statutInitial) router.refresh();
    };
    lire();
    const minuteur = setInterval(lire, INTERVALLE_MS);
    return () => {
      actif = false;
      clearInterval(minuteur);
    };
  }, [jeton, statutInitial, router]);

  useEffect(() => {
    let annule = false;
    import("maplibre-gl").then(({ AttributionControl, Map, setWorkerUrl }) => {
      if (annule || !conteneur.current) return;
      setWorkerUrl("/maplibre-gl-worker.mjs");
      const m = new Map({ container: conteneur.current, style: STYLE, center: [55.53, -21.13], zoom: 8.6, attributionControl: false, cooperativeGestures: true });
      m.addControl(new AttributionControl({ compact: true }), "top-left");
      m.on("load", () => {
        m.getContainer().querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show");
        m.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "route-bord", type: "line", source: "route", paint: { "line-color": "#121212", "line-width": 7 }, layout: { "line-cap": "round" } });
        m.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#FFC800", "line-width": 4 }, layout: { "line-cap": "round" } });
        setPrete(true);
      });
      carte.current = m;
    });
    return () => {
      annule = true;
      carte.current?.remove();
      carte.current = null;
    };
  }, []);

  useEffect(() => {
    const m = carte.current;
    if (!prete || !m || !etat) return;
    import("maplibre-gl").then(({ Marker, LngLatBounds }) => {
      const mk = marqueurs.current;
      const placer = (cle: "depart" | "arrivee" | "camion", p: Point | null, creer: () => HTMLElement) => {
        if (!p) {
          mk[cle]?.remove();
          mk[cle] = undefined;
          return;
        }
        if (!mk[cle]) mk[cle] = new Marker({ element: creer() }).setLngLat([p.lng, p.lat]).addTo(m);
        else mk[cle]!.setLngLat([p.lng, p.lat]);
      };
      placer("depart", etat.depart, () => element("size-5 rounded-full border-[5px] border-noir bg-jaune shadow-carte"));
      placer("arrivee", etat.arrivee, () => element("size-5 rounded-[4px] border-[5px] border-noir bg-blanc shadow-carte"));
      placer("camion", etat.camion, () => element("flex size-11 items-center justify-center rounded-full border-[3px] border-jaune bg-noir text-[1.4rem] shadow-carte", "🚚"));
      (m.getSource("route") as GeoJSONSource | undefined)?.setData(
        etat.ligne ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: etat.ligne } } : { type: "FeatureCollection", features: [] },
      );
      // Cadrage au premier affichage puis quand le camion apparaît.
      if (!cadre.current || (etat.camion && cadre.current && !mk.camion?.getElement().dataset.cadre)) {
        const zone = new LngLatBounds([etat.depart.lng, etat.depart.lat], [etat.depart.lng, etat.depart.lat]).extend([etat.arrivee.lng, etat.arrivee.lat]);
        if (etat.camion) {
          zone.extend([etat.camion.lng, etat.camion.lat]);
          mk.camion!.getElement().dataset.cadre = "1";
        }
        m.fitBounds(zone, { padding: 50, maxZoom: 14, duration: cadre.current ? 600 : 0 });
        cadre.current = true;
      }
    });
  }, [prete, etat]);

  const vers = etat?.statut === "enlevee" ? "livraison" : "chargement";
  return (
    <div className="carte space-y-3 p-3 sm:p-4">
      {etat?.camion && etat.minutes != null ? (
        <p className="px-1 font-bold">
          <Clock className="mr-1.5 inline size-5 align-[-4px] text-alerte" />
          {etat.statut === "enlevee" ? "Livraison estimée dans" : "Arrivée du transporteur au chargement dans"}{" "}
          <span className="chiffres text-h4 font-extrabold">{etat.minutes} min</span>
        </p>
      ) : (
        ["acceptee", "enlevee"].includes(etat?.statut ?? "") && (
          <p className="px-1 text-petit text-gris-500">Position du transporteur en attente (vers le {vers})…</p>
        )
      )}
      <div ref={conteneur} className="h-64 overflow-hidden rounded-champ sm:h-80" role="img" aria-label="Carte du suivi en direct" />
      <p className="flex items-center gap-2 px-1 text-[0.8rem] text-gris-500">
        <span className="size-2 animate-pulse rounded-full bg-succes" /> Suivi en direct : la page se met à jour toute seule.
      </p>
    </div>
  );
}
