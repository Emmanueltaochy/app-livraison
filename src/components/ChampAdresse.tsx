"use client";

import { Loader2, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { COMMUNES, communeParInsee, type Point } from "@/lib/communes";

export type Adresse = { libelle: string; commune: string; point?: Point };

type Suggestion = { libelle: string; commune: string; point: Point };

const COMMUNES_TRIEES = [...COMMUNES].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

// Géocodage de l'IGN (Géoplateforme, gratuit, sans clé), et l'ancienne API de la Base Adresse Nationale
// en secours. On oriente la recherche vers La Réunion et on écarte la métropole.
const SERVICES = ["https://data.geopf.fr/geocodage/search", "https://api-adresse.data.gouv.fr/search/"];
const DELAI_MS = 5000;

type Reponse = { features: { geometry: { coordinates: [number, number] }; properties: { label: string; citycode: string } }[] };

async function chercher(q: string, signal: AbortSignal): Promise<Suggestion[]> {
  const parametres = `?q=${encodeURIComponent(q)}&limit=20&autocomplete=1&lat=-21.13&lon=55.53`;
  let json: Reponse | null = null;
  for (const service of SERVICES) {
    try {
      // Délai maximum par service (sans AbortSignal.any, absent des anciens iPhone).
      const limite = new AbortController();
      const arreter = () => limite.abort();
      signal.addEventListener("abort", arreter);
      const minuteur = setTimeout(arreter, DELAI_MS);
      try {
        const res = await fetch(service + parametres, { signal: limite.signal });
        if (res.ok) {
          json = await res.json();
          break;
        }
      } finally {
        clearTimeout(minuteur);
        signal.removeEventListener("abort", arreter);
      }
    } catch (e) {
      if (signal.aborted) throw e; // nouvelle saisie : on abandonne cette recherche
    }
  }
  if (!json) throw new Error("Service d'adresses indisponible");
  const vues = new Set<string>();
  return json.features
    .map((f) => {
      const commune = communeParInsee(f.properties.citycode);
      if (!commune || vues.has(f.properties.label)) return null;
      vues.add(f.properties.label);
      const [lng, lat] = f.geometry.coordinates;
      return { libelle: f.properties.label, commune: commune.id, point: { lat, lng } };
    })
    .filter((s): s is Suggestion => s !== null)
    .slice(0, 6);
}

// Champ d'adresse avec suggestions. Envoie au serveur : adresse_<prefixe>, commune_<prefixe>,
// <prefixe>_lat et <prefixe>_lng. Sans suggestion choisie, on demande la commune.
export function ChampAdresse({
  prefixe,
  libelle,
  valeur,
  onChange,
}: {
  prefixe: "depart" | "arrivee";
  libelle: string;
  valeur: Adresse;
  onChange: (a: Adresse) => void;
}) {
  const id = useId();
  const [saisie, setSaisie] = useState(valeur.libelle);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [focus, setFocus] = useState(false);
  const [message, setMessage] = useState<string>();
  // Libellé de la dernière suggestion choisie : inutile de relancer une recherche dessus.
  const choisie = useRef(valeur.libelle);

  useEffect(() => {
    const q = saisie.trim();
    if (q.length < 4 || q === choisie.current) {
      setSuggestions([]);
      setMessage(undefined);
      return;
    }
    const controle = new AbortController();
    const minuteur = setTimeout(async () => {
      setChargement(true);
      try {
        const resultats = await chercher(q, controle.signal);
        setSuggestions(resultats);
        setMessage(resultats.length ? undefined : "Aucune adresse trouvée à La Réunion : ajoutez la commune (ex. « 12 rue de Paris Saint-Denis »).");
        setActif(0);
        setOuvert(true);
      } catch {
        // Service indisponible : la saisie libre + choix de la commune reste possible.
        if (!controle.signal.aborted) setMessage("Recherche d'adresse momentanément indisponible : saisissez l'adresse puis choisissez la commune.");
      } finally {
        if (!controle.signal.aborted) setChargement(false);
      }
    }, 250);
    return () => {
      clearTimeout(minuteur);
      controle.abort();
    };
  }, [saisie]);

  const choisir = (s: Suggestion) => {
    choisie.current = s.libelle;
    setSaisie(s.libelle);
    setOuvert(false);
    onChange({ libelle: s.libelle, commune: s.commune, point: s.point });
  };

  // Adresse saisie mais non reconnue (champ quitté sans choisir de suggestion).
  const sansPoint = !valeur.point && !focus && saisie.trim().length >= 5;

  return (
    <div className="relative">
      <label className="etiquette" htmlFor={id}>{libelle}</label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gris-500" />
        <input
          id={id}
          name={`adresse_${prefixe}`}
          className="champ pl-10"
          required
          autoComplete="off"
          placeholder="N°, rue, commune"
          role="combobox"
          aria-expanded={ouvert && suggestions.length > 0}
          aria-controls={`${id}-liste`}
          value={saisie}
          onChange={(e) => {
            setSaisie(e.target.value);
            // L'adresse a été modifiée : on oublie les coordonnées de l'ancienne suggestion.
            onChange({ libelle: e.target.value, commune: valeur.commune, point: undefined });
          }}
          onFocus={() => {
            setFocus(true);
            if (suggestions.length > 0) setOuvert(true);
          }}
          onBlur={() => {
            setFocus(false);
            setTimeout(() => setOuvert(false), 150);
          }}
          onKeyDown={(e) => {
            if (!ouvert || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActif((a) => (a + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActif((a) => (a - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              choisir(suggestions[actif]);
            } else if (e.key === "Escape") {
              setOuvert(false);
            }
          }}
        />
        {chargement && <Loader2 className="absolute top-1/2 right-3 size-5 -translate-y-1/2 animate-spin text-gris-500" />}
      </div>
      <input type="hidden" name={`${prefixe}_lat`} value={valeur.point?.lat ?? ""} />
      <input type="hidden" name={`${prefixe}_lng`} value={valeur.point?.lng ?? ""} />

      {ouvert && suggestions.length > 0 && (
        <ul id={`${id}-liste`} role="listbox" className="absolute z-30 mt-1 w-full overflow-hidden rounded-champ border border-gris-300 bg-blanc shadow-flottante">
          {suggestions.map((s, i) => (
            <li
              key={s.libelle}
              role="option"
              aria-selected={i === actif}
              onMouseDown={(e) => {
                e.preventDefault();
                choisir(s);
              }}
              className={`flex cursor-pointer items-center gap-2 px-3.5 py-3 ${i === actif ? "bg-jaune-clair" : "hover:bg-gris-100"}`}
            >
              <MapPin className="size-4 shrink-0 text-gris-500" /> {s.libelle}
            </li>
          ))}
        </ul>
      )}

      {message && focus && <p className="mt-1.5 text-petit text-alerte" role="status">{message}</p>}

      {/* Sans adresse reconnue, la commune suffit pour estimer le prix. */}
      {sansPoint ? (
        <div className="mt-2">
          <label className="text-petit text-gris-500" htmlFor={`${id}-commune`}>
            Adresse non trouvée ? Choisissez la commune :
          </label>
          <select
            id={`${id}-commune`}
            name={`commune_${prefixe}`}
            className="champ mt-1"
            value={valeur.commune}
            onChange={(e) => onChange({ ...valeur, commune: e.target.value })}
          >
            {COMMUNES_TRIEES.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      ) : (
        <input type="hidden" name={`commune_${prefixe}`} value={valeur.commune} />
      )}
    </div>
  );
}
