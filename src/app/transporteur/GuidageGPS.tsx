"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as CarteMapLibre, Marker } from "maplibre-gl";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Flag,
  Navigation,
  RotateCw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { haversineKm, type Point } from "@/lib/communes";

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const RECALCUL_METRES = 120; // nouveau calcul d'itinéraire après ce déplacement
const RECALCUL_MS = 30_000; // et au moins toutes les 30 s (trafic, détour)

type Etape = { type: string; direction: string | null; sortie: number | null; rue: string; point: Point };
type Itineraire = { minutes: number; km: number; ligne: [number, number][]; etapes: Etape[] };

const DIRECTIONS: Record<string, string> = {
  left: "tournez à gauche",
  right: "tournez à droite",
  "slight left": "serrez à gauche",
  "slight right": "serrez à droite",
  "sharp left": "tournez franchement à gauche",
  "sharp right": "tournez franchement à droite",
  straight: "continuez tout droit",
  uturn: "faites demi-tour",
};

// Instruction en français à partir d'une manœuvre OSRM.
function instruction(e: Etape): string {
  const sur = e.rue ? ` sur ${e.rue}` : "";
  if (e.type === "arrive") return "Vous êtes arrivé";
  if (e.type === "roundabout" || e.type === "rotary" || e.type === "exit roundabout") {
    return e.sortie ? `Au rond-point, prenez la ${e.sortie === 1 ? "1re" : `${e.sortie}e`} sortie${sur}` : `Prenez le rond-point${sur}`;
  }
  if (e.type === "merge") return `Insérez-vous${sur}`;
  if (e.type === "on ramp") return `Prenez la bretelle${sur}`;
  if (e.type === "off ramp") return `Sortez${sur}`;
  if (e.type === "fork") return `${e.direction?.includes("left") ? "Restez à gauche" : "Restez à droite"}${sur}`;
  const dir = DIRECTIONS[e.direction ?? "straight"] ?? "continuez";
  return `${dir.charAt(0).toUpperCase()}${dir.slice(1)}${sur}`;
}

function IconeManoeuvre({ e, className }: { e: Etape; className: string }) {
  if (e.type === "arrive") return <Flag className={className} />;
  if (e.type.includes("roundabout") || e.type === "rotary") return <RotateCw className={className} />;
  const d = e.direction ?? "";
  if (d === "left" || d === "sharp left") return <ArrowLeft className={className} />;
  if (d === "right" || d === "sharp right") return <ArrowRight className={className} />;
  if (d === "slight left") return <ArrowUpLeft className={className} />;
  if (d === "slight right") return <ArrowUpRight className={className} />;
  return <ArrowUp className={className} />;
}

const distanceLisible = (m: number) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`);

function parler(texte: string) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(texte);
  u.lang = "fr-FR";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// Flèche de navigation (comme Google Maps) : posée à plat sur la route, pointe dans le sens de la marche.
function elementCamion() {
  const el = document.createElement("div");
  el.innerHTML =
    '<svg viewBox="0 0 48 48" width="64" height="64" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="#121212" stroke="#FFC800" stroke-width="3"/><path d="M24 10 35 35 24 29 13 35Z" fill="#FFC800"/></svg>';
  el.setAttribute("aria-label", "Votre position");
  return el;
}

// Cap (en degrés, 0 = nord) pour aller de a vers b.
function cap(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad);
  const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

// Guidage GPS plein écran dans l'app : la carte suit le camion, instruction suivante en haut
// (lue à voix haute), temps et distance restants en bas. Itinéraire recalculé en roulant.
export function GuidageGPS({ destination, libelle, onFermer }: { destination: Point; libelle: string; onFermer: () => void }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteMapLibre | null>(null);
  const camion = useRef<Marker | null>(null);
  const [prete, setPrete] = useState(false);
  const [moi, setMoi] = useState<Point>();
  const [direction, setDirection] = useState<number | null>(null);
  const [suivre, setSuivre] = useState(true);
  const precedent = useRef<Point | null>(null);
  const [itineraire, setItineraire] = useState<Itineraire | null>(null);
  const [erreur, setErreur] = useState<string>();
  const [voix, setVoix] = useState(true);
  const dernierCalcul = useRef<{ point: Point; quand: number } | null>(null);
  const derniereAnnonce = useRef("");

  // Carte plein écran.
  useEffect(() => {
    let annule = false;
    import("maplibre-gl").then(({ AttributionControl, Map, setWorkerUrl }) => {
      if (annule || !conteneur.current) return;
      setWorkerUrl("/maplibre-gl-worker.mjs");
      const m = new Map({ container: conteneur.current, style: STYLE, center: [destination.lng, destination.lat], zoom: 13, attributionControl: false, maxPitch: 70 });
      // Le chauffeur déplace la carte : on arrête de la recentrer jusqu'à « Recentrer ».
      m.on("dragstart", () => setSuivre(false));
      m.addControl(new AttributionControl({ compact: true }), "bottom-left");
      m.on("load", () => {
        // Mention repliée en « i » dès l'affichage (MapLibre la déplie au chargement).
        m.getContainer().querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show");
        // Bâtiments en relief, pour la vue 3D.
        m.addLayer({
          id: "batiments-3d",
          type: "fill-extrusion",
          source: "openmaptiles",
          "source-layer": "building",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": "#dedbd3",
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": 0.85,
          },
        });
        m.addSource("guidage", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "guidage-bord", type: "line", source: "guidage", paint: { "line-color": "#121212", "line-width": 11 }, layout: { "line-cap": "round", "line-join": "round" } });
        m.addLayer({ id: "guidage", type: "line", source: "guidage", paint: { "line-color": "#FFC800", "line-width": 7 }, layout: { "line-cap": "round", "line-join": "round" } });
        import("maplibre-gl").then(({ Marker }) => {
          const drapeau = document.createElement("div");
          drapeau.className = "rounded-pastille border-2 border-noir bg-jaune px-2.5 py-1 text-[0.8rem] font-extrabold text-noir shadow-carte";
          drapeau.textContent = libelle;
          new Marker({ element: drapeau }).setLngLat([destination.lng, destination.lat]).addTo(m);
        });
        setPrete(true);
      });
      carte.current = m;
    });
    return () => {
      annule = true;
      carte.current?.remove();
      carte.current = null;
    };
  }, [destination.lat, destination.lng, libelle]);

  // Position : suivi GPS partagé (app) ou géolocalisation du téléphone ; l'écran reste allumé.
  useEffect(() => {
    // Cap : celui du GPS quand on roule, sinon calculé entre deux positions assez éloignées.
    const recevoir = (p: Point, gps?: number | null, vitesse?: number | null) => {
      setMoi(p);
      const avant = precedent.current;
      if (gps != null && !Number.isNaN(gps) && (vitesse ?? 0) > 1.5) {
        setDirection(gps);
        precedent.current = p;
      } else if (!avant || haversineKm(avant, p) * 1000 > 8) {
        if (avant) setDirection(cap(avant, p));
        precedent.current = p;
      }
    };
    const auPartage = (e: Event) => recevoir((e as CustomEvent<Point>).detail);
    window.addEventListener("fretpei:position", auPartage);
    const id =
      "geolocation" in navigator
        ? navigator.geolocation.watchPosition((p) => recevoir({ lat: p.coords.latitude, lng: p.coords.longitude }, p.coords.heading, p.coords.speed), () => setErreur("Activez la localisation pour être guidé."), {
            enableHighAccuracy: true,
            maximumAge: 3000,
          })
        : undefined;
    let verrou: { release(): Promise<void> } | undefined;
    (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock
      ?.request("screen")
      .then((v) => (verrou = v))
      .catch(() => {});
    return () => {
      window.removeEventListener("fretpei:position", auPartage);
      if (id !== undefined) navigator.geolocation.clearWatch(id);
      verrou?.release().catch(() => {});
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Itinéraire recalculé quand on s'est déplacé ou que le précédent date un peu.
  useEffect(() => {
    if (!moi) return;
    const d = dernierCalcul.current;
    if (d && haversineKm(d.point, moi) * 1000 < RECALCUL_METRES && Date.now() - d.quand < RECALCUL_MS) return;
    dernierCalcul.current = { point: moi, quand: Date.now() };
    fetch(`/api/itineraire?de=${moi.lat},${moi.lng}&a=${destination.lat},${destination.lng}&etapes=1`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((i: Itineraire) => {
        setItineraire(i);
        setErreur(undefined);
      })
      .catch(() => setErreur("Itinéraire indisponible : utilisez Google Maps ou Waze."));
  }, [moi, destination.lat, destination.lng]);

  // Sans mouvement (au départ), on regarde dans le sens de l'itinéraire.
  const capRoute = itineraire && moi && itineraire.ligne.length > 1 ? cap(moi, { lng: itineraire.ligne[Math.min(3, itineraire.ligne.length - 1)][0], lat: itineraire.ligne[Math.min(3, itineraire.ligne.length - 1)][1] }) : 0;
  const capActuel = direction ?? capRoute;

  // Vue 3D type GPS : carte inclinée, orientée dans le sens de la marche, la flèche en bas de l'écran.
  useEffect(() => {
    const m = carte.current;
    if (!prete || !m || !moi) return;
    import("maplibre-gl").then(({ Marker }) => {
      if (!camion.current) {
        camion.current = new Marker({ element: elementCamion(), rotationAlignment: "map", pitchAlignment: "map" }).setLngLat([moi.lng, moi.lat]).addTo(m);
      } else camion.current.setLngLat([moi.lng, moi.lat]);
      camion.current.setRotation(capActuel);
      if (suivre) {
        m.easeTo({
          center: [moi.lng, moi.lat],
          bearing: capActuel,
          pitch: 60,
          zoom: 17,
          padding: { top: m.getContainer().clientHeight * 0.55, bottom: 0, left: 0, right: 0 },
          duration: 900,
        });
      }
    });
  }, [prete, moi, capActuel, suivre]);

  useEffect(() => {
    const source = carte.current?.getSource("guidage") as GeoJSONSource | undefined;
    if (!prete || !source) return;
    source.setData(itineraire ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: itineraire.ligne } } : { type: "FeatureCollection", features: [] });
  }, [prete, itineraire]);

  // Prochaine manœuvre : la 1re après le départ (l'itinéraire part toujours de la position actuelle).
  const prochaine = itineraire?.etapes.find((e, i) => i > 0 && (!moi || haversineKm(moi, e.point) * 1000 > 15)) ?? itineraire?.etapes.at(-1);
  const distance = prochaine && moi ? haversineKm(moi, prochaine.point) * 1000 : 0;
  const arrivee = itineraire ? new Date(Date.now() + itineraire.minutes * 60_000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Indian/Reunion" }) : "";

  // Annonce vocale : à chaque nouvelle manœuvre, puis à l'approche (moins de 150 m).
  useEffect(() => {
    if (!voix || !prochaine) return;
    const texte = instruction(prochaine);
    const proche = distance < 150;
    const cle = `${texte}|${proche}`;
    if (derniereAnnonce.current === cle) return;
    derniereAnnonce.current = cle;
    parler(proche || prochaine.type === "arrive" ? texte : `Dans ${distanceLisible(distance)}, ${texte.charAt(0).toLowerCase()}${texte.slice(1)}`);
  }, [voix, prochaine, distance]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-noir text-blanc">
      <div className="z-10 bg-noir px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 shadow-flottante">
        {prochaine ? (
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-carte bg-jaune text-noir">
              <IconeManoeuvre e={prochaine} className="size-9" />
            </span>
            <div className="min-w-0">
              <p className="chiffres text-h2 leading-none font-extrabold">{prochaine.type === "arrive" ? "" : distanceLisible(distance)}</p>
              <p className="mt-1 truncate text-h4 font-bold">{instruction(prochaine)}</p>
            </div>
          </div>
        ) : (
          <p className="py-3 text-h4 font-bold text-gris-300">{erreur ?? (moi ? "Calcul de l'itinéraire…" : "Recherche de votre position…")}</p>
        )}
      </div>

      <div className="relative flex-1">
        <div ref={conteneur} className="size-full" role="img" aria-label="Guidage GPS" />
        {!suivre && (
          <button type="button" onClick={() => setSuivre(true)} className="absolute bottom-6 left-1/2 flex h-12 -translate-x-1/2 items-center gap-2 rounded-pastille bg-noir px-5 font-extrabold text-jaune shadow-flottante">
            <Navigation className="size-5" /> Recentrer
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-noir-700 bg-noir px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button type="button" onClick={onFermer} aria-label="Quitter le guidage" className="flex size-12 shrink-0 items-center justify-center rounded-pastille bg-noir-700">
          <X className="size-6" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          {itineraire ? (
            <>
              <p className="chiffres text-h3 font-extrabold text-jaune">
                {itineraire.minutes} min · {itineraire.km.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km
              </p>
              <p className="text-petit text-gris-300">
                Arrivée au {libelle.toLowerCase()} vers {arrivee}
              </p>
            </>
          ) : (
            <p className="text-gris-300">{libelle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setVoix((v) => !v)}
          aria-label={voix ? "Couper la voix" : "Activer la voix"}
          className="flex size-12 shrink-0 items-center justify-center rounded-pastille bg-noir-700"
        >
          {voix ? <Volume2 className="size-6" /> : <VolumeX className="size-6 text-gris-300" />}
        </button>
      </div>
    </div>
  );
}
