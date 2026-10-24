"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as CarteMapLibre, Marker } from "maplibre-gl";
import { Clock, ExternalLink, LocateFixed, Route } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { haversineKm, type Point } from "@/lib/communes";

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const CENTRE_REUNION: [number, number] = [55.53, -21.13];

export type Cible = { id: string; point: Point; etiquette: string };
type Trajet = { minutes: number; km: number; ligne: [number, number][]; estime: boolean };

// Itinéraire routier calculé par notre serveur (OSRM) ; à défaut, estimation.
async function calculerTrajet(a: Point, b: Point): Promise<Trajet> {
  try {
    const r = await fetch(`/api/itineraire?de=${a.lat},${a.lng}&a=${b.lat},${b.lng}`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) return { ...(await r.json()), estime: false };
  } catch {}
  // Service d'itinéraire indisponible : estimation (route ≈ 1,4 × vol d'oiseau, 40 km/h de moyenne).
  const km = haversineKm(a, b) * 1.4;
  return { minutes: Math.max(1, Math.round((km / 40) * 60)), km, ligne: [[a.lng, a.lat], [b.lng, b.lat]], estime: true };
}

const lienGoogleMaps = (p: Point) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`;

function elementCamion() {
  const el = document.createElement("div");
  el.className = "flex size-11 items-center justify-center rounded-full border-[3px] border-jaune bg-noir text-[1.4rem] shadow-carte";
  el.textContent = "🚚";
  el.setAttribute("aria-label", "Votre position");
  return el;
}

function elementCible(etiquette: string, active: boolean) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `rounded-pastille border-2 px-2.5 py-1 text-[0.8rem] font-extrabold shadow-carte ${active ? "border-noir bg-jaune text-noir" : "border-jaune bg-noir text-blanc"}`;
  el.textContent = etiquette;
  return el;
}

// Carte du chauffeur : sa position en direct (camion), les points de chargement, et le trajet jusqu'au point choisi.
export function CarteChauffeur({
  cibles,
  selection,
  onSelection,
  positionInitiale,
  libelleCible = "chargement",
  className = "",
}: {
  cibles: Cible[];
  selection?: string;
  onSelection?: (id: string) => void;
  positionInitiale?: Point;
  libelleCible?: string;
  className?: string;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteMapLibre | null>(null);
  const camion = useRef<Marker | null>(null);
  const marqueurs = useRef<Marker[]>([]);
  const suivre = useRef(true);
  const [prete, setPrete] = useState(false);
  const [moi, setMoi] = useState<Point | undefined>(positionInitiale);
  const [trajet, setTrajet] = useState<Trajet | null>(null);
  const choisie = cibles.find((c) => c.id === selection);

  // Création de la carte (une seule fois).
  useEffect(() => {
    let annule = false;
    import("maplibre-gl").then(({ AttributionControl, Map, setWorkerUrl }) => {
      if (annule || !conteneur.current) return;
      setWorkerUrl("/maplibre-gl-worker.mjs");
      const m = new Map({
        container: conteneur.current,
        style: STYLE,
        center: positionInitiale ? [positionInitiale.lng, positionInitiale.lat] : CENTRE_REUNION,
        zoom: positionInitiale ? 12 : 8.6,
        attributionControl: false,
      });
      // Mention OpenStreetMap en haut à gauche : le bas de la carte accueille le temps de trajet.
      m.addControl(new AttributionControl({ compact: true }), "top-left");
      m.on("dragstart", () => (suivre.current = false));
      m.on("load", () => {
        m.addSource("trajet", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "trajet-bord", type: "line", source: "trajet", paint: { "line-color": "#121212", "line-width": 8 }, layout: { "line-cap": "round", "line-join": "round" } });
        m.addLayer({ id: "trajet", type: "line", source: "trajet", paint: { "line-color": "#FFC800", "line-width": 4.5 }, layout: { "line-cap": "round", "line-join": "round" } });
        setPrete(true);
      });
      carte.current = m;
    });
    return () => {
      annule = true;
      carte.current?.remove();
      carte.current = null;
    };
    // positionInitiale ne sert qu'au premier affichage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Position en direct : celle partagée par le suivi GPS, sinon la géolocalisation de l'appareil.
  useEffect(() => {
    const auPartage = (e: Event) => setMoi((e as CustomEvent<Point>).detail);
    window.addEventListener("fretpei:position", auPartage);
    let id: number | undefined;
    if ("geolocation" in navigator) {
      id = navigator.geolocation.watchPosition((p) => setMoi({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, {
        enableHighAccuracy: true,
        maximumAge: 15_000,
      });
    }
    return () => {
      window.removeEventListener("fretpei:position", auPartage);
      if (id !== undefined) navigator.geolocation.clearWatch(id);
    };
  }, []);

  // Camion : déplacé à chaque position, la carte le suit tant que le chauffeur ne la fait pas glisser.
  useEffect(() => {
    const m = carte.current;
    if (!prete || !m || !moi) return;
    import("maplibre-gl").then(({ Marker }) => {
      if (!camion.current) camion.current = new Marker({ element: elementCamion() }).setLngLat([moi.lng, moi.lat]).addTo(m);
      else camion.current.setLngLat([moi.lng, moi.lat]);
      if (suivre.current && !choisie) m.easeTo({ center: [moi.lng, moi.lat], zoom: Math.max(m.getZoom(), 12), duration: 600 });
    });
  }, [prete, moi, choisie]);

  // Points de chargement (prix ou étape), le point choisi en jaune.
  useEffect(() => {
    const m = carte.current;
    if (!prete || !m) return;
    import("maplibre-gl").then(({ Marker }) => {
      marqueurs.current.forEach((mk) => mk.remove());
      marqueurs.current = cibles.map((c) => {
        const el = elementCible(c.etiquette, c.id === selection);
        el.addEventListener("click", () => onSelection?.(c.id));
        return new Marker({ element: el }).setLngLat([c.point.lng, c.point.lat]).addTo(m);
      });
    });
  }, [prete, cibles, selection, onSelection]);

  // Trajet camion → point choisi (recalculé si le chauffeur s'est déplacé de plus de 300 m).
  const departTrajet = useRef<Point | undefined>(undefined);
  useEffect(() => {
    if (!choisie || !moi) {
      setTrajet(null);
      departTrajet.current = undefined;
      return;
    }
    if (departTrajet.current && haversineKm(departTrajet.current, moi) < 0.3 && trajet) return;
    departTrajet.current = moi;
    let annule = false;
    calculerTrajet(moi, choisie.point).then((t) => !annule && setTrajet(t));
    return () => {
      annule = true;
    };
    // trajet volontairement absent : il ne doit pas relancer le calcul.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choisie?.id, choisie?.point.lat, choisie?.point.lng, moi]);

  useEffect(() => {
    const m = carte.current;
    if (!prete || !m) return;
    const source = m.getSource("trajet") as GeoJSONSource | undefined;
    source?.setData(
      trajet
        ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: trajet.ligne } }
        : { type: "FeatureCollection", features: [] },
    );
    if (choisie) {
      import("maplibre-gl").then(({ LngLatBounds }) => {
        const zone = new LngLatBounds([choisie.point.lng, choisie.point.lat], [choisie.point.lng, choisie.point.lat]);
        if (moi) zone.extend([moi.lng, moi.lat]);
        trajet?.ligne.forEach((c) => zone.extend(c));
        m.fitBounds(zone, { padding: { top: 50, bottom: 110, left: 40, right: 40 }, maxZoom: 14, duration: 600 });
      });
    }
    // Recadrage uniquement quand le trajet ou la sélection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prete, trajet, choisie?.id]);

  const recentrer = () => {
    suivre.current = true;
    if (moi) carte.current?.easeTo({ center: [moi.lng, moi.lat], zoom: 13, duration: 500 });
  };

  return (
    <div className={`relative overflow-hidden rounded-carte bg-noir-800 ${className}`}>
      <div ref={conteneur} className="size-full" role="img" aria-label="Carte : votre position et les points de chargement" />
      {!moi && (
        <p className="absolute top-3 left-3 rounded-pastille bg-noir/85 px-3 py-1.5 text-petit text-gris-300">Recherche de votre position…</p>
      )}
      <button
        type="button"
        onClick={recentrer}
        aria-label="Recentrer sur ma position"
        className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-pastille bg-noir text-jaune shadow-carte"
      >
        <LocateFixed className="size-5" />
      </button>
      {choisie && (
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-carte bg-noir/95 p-3 shadow-carte">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-extrabold tracking-wider text-gris-300">JUSQU&apos;AU {libelleCible.toUpperCase()}</p>
            {trajet ? (
              <p className="flex flex-wrap items-center gap-x-3 font-extrabold">
                <span className="flex items-center gap-1 text-h4 text-jaune">
                  <Clock className="size-5" /> {trajet.estime && "≈ "}
                  {trajet.minutes} min
                </span>
                <span className="flex items-center gap-1">
                  <Route className="size-4" /> {trajet.km.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km
                </span>
              </p>
            ) : (
              <p className="text-gris-300">{moi ? "Calcul du trajet…" : "Activez la localisation"}</p>
            )}
          </div>
          <a
            href={lienGoogleMaps(choisie.point)}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-bouton bg-jaune px-3 text-petit font-extrabold text-noir"
          >
            Google Maps <ExternalLink className="size-4" />
          </a>
        </div>
      )}
    </div>
  );
}
