"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as CarteMapLibre, Marker } from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { Point } from "@/lib/communes";

// Fond de carte OpenStreetMap gratuit et sans clé (OpenFreeMap).
const STYLE = "https://tiles.openfreemap.org/styles/positron";
const CENTRE_REUNION: [number, number] = [55.53, -21.13];

function marqueur(forme: "depart" | "arrivee") {
  const el = document.createElement("div");
  el.className =
    forme === "depart"
      ? "size-5 rounded-full border-[5px] border-noir bg-jaune shadow-carte"
      : "size-5 rounded-[4px] border-[5px] border-noir bg-blanc shadow-carte";
  return el;
}

// Carte du trajet : départ (rond), arrivée (carré) et liaison directe entre les deux.
export function CarteTrajet({ depart, arrivee, className = "" }: { depart?: Point; arrivee?: Point; className?: string }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteMapLibre | null>(null);
  const marqueurs = useRef<Marker[]>([]);
  const points = useRef({ depart, arrivee });
  points.current = { depart, arrivee };

  const dessiner = () => {
    const m = carte.current;
    if (!m || !m.isStyleLoaded()) return;
    import("maplibre-gl").then(({ Marker, LngLatBounds }) => {
      marqueurs.current.forEach((mk) => mk.remove());
      marqueurs.current = [];
      const { depart: a, arrivee: b } = points.current;
      for (const [p, forme] of [[a, "depart"], [b, "arrivee"]] as const) {
        if (p) marqueurs.current.push(new Marker({ element: marqueur(forme) }).setLngLat([p.lng, p.lat]).addTo(m));
      }
      const ligne = {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: a && b ? [[a.lng, a.lat], [b.lng, b.lat]] : [] },
      };
      const source = m.getSource("trajet") as { setData?: (d: typeof ligne) => void } | undefined;
      if (source?.setData) source.setData(ligne);
      else {
        m.addSource("trajet", { type: "geojson", data: ligne });
        m.addLayer({ id: "trajet", type: "line", source: "trajet", paint: { "line-color": "#121212", "line-width": 4, "line-dasharray": [2, 1.5] } });
      }
      if (a && b) {
        m.fitBounds(new LngLatBounds([a.lng, a.lat], [a.lng, a.lat]).extend([b.lng, b.lat]), { padding: 60, maxZoom: 14, duration: 600 });
      } else if (a || b) {
        const p = (a ?? b)!;
        m.flyTo({ center: [p.lng, p.lat], zoom: 13 });
      }
    });
  };

  useEffect(() => {
    let annule = false;
    import("maplibre-gl").then(({ Map, setWorkerUrl }) => {
      if (annule || !conteneur.current) return;
      setWorkerUrl("/maplibre-gl-worker.mjs"); // copié par scripts/copier-worker-carte.mjs
      carte.current = new Map({
        container: conteneur.current,
        style: STYLE,
        center: CENTRE_REUNION,
        zoom: 8.6,
        attributionControl: { compact: true },
        cooperativeGestures: true,
      });
      carte.current.on("load", dessiner);
    });
    return () => {
      annule = true;
      carte.current?.remove();
      carte.current = null;
    };
    // La carte n'est créée qu'une fois ; les points sont redessinés par l'effet suivant.
  }, []);

  useEffect(dessiner, [depart?.lat, depart?.lng, arrivee?.lat, arrivee?.lng]);

  return <div ref={conteneur} className={`overflow-hidden rounded-carte bg-gris-100 ${className}`} aria-label="Carte du trajet" role="img" />;
}
