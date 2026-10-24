"use client";

import { ArrowRight, Box, Check, MapPin, Route, Truck, Users, Wrench, Zap } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { accepterCourse } from "@/app/actions/transporteur";
import type { Point } from "@/lib/communes";
import { CarteChauffeur, type Cible } from "./CarteChauffeur";
import { Pastille } from "./Pastille";

export type CourseDisponible = {
  id: string;
  depart: string;
  arrivee: string;
  date: string;
  description: string;
  vehicule: string;
  distanceKm: number;
  personnes: number;
  volume: number | null;
  demontage: boolean;
  express: boolean;
  gain: string;
  point: Point; // point de chargement approché (l'adresse exacte n'est révélée qu'après acceptation)
};

// Carte en haut (position en direct + points de chargement), liste des courses dessous.
// Toucher une course l'affiche sur la carte avec le temps de trajet jusqu'au chargement.
export function ListeCourses({ courses, positionInitiale, peutAccepter }: { courses: CourseDisponible[]; positionInitiale?: Point; peutAccepter: boolean }) {
  const [selection, setSelection] = useState<string>();
  const zoneCarte = useRef<HTMLDivElement>(null);
  const cibles = useMemo<Cible[]>(() => courses.map((c) => ({ id: c.id, point: c.point, etiquette: c.gain })), [courses]);

  const choisir = useCallback((id: string) => {
    setSelection((s) => (s === id ? undefined : id));
    zoneCarte.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  return (
    <>
      <div ref={zoneCarte} className="scroll-mt-24">
        <CarteChauffeur
          cibles={cibles}
          selection={selection}
          onSelection={(id) => {
            setSelection(id);
            document.getElementById(`course-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          positionInitiale={positionInitiale}
          className="h-[42vh] min-h-64"
        />
      </div>

      <section aria-label="Courses disponibles" className="space-y-4">
        {courses.length > 0 && <p className="text-petit text-gris-300">Touchez une course pour voir le trajet jusqu&apos;au chargement.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((c) => {
            const active = c.id === selection;
            return (
              <article
                key={c.id}
                id={`course-${c.id}`}
                onClick={(e) => {
                  if (!(e.target as Element).closest("form")) choisir(c.id);
                }}
                className={`cursor-pointer space-y-4 rounded-carte border-2 bg-noir-800 p-5 transition-colors ${active ? "border-jaune" : "border-noir-700"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-h4 font-extrabold">{c.depart}</p>
                    <p className="flex items-center gap-1 text-h4 font-extrabold">
                      <ArrowRight className="size-5" strokeWidth={3} /> {c.arrivee}
                    </p>
                    <p className="mt-1 text-gris-300">{c.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-petit font-extrabold tracking-wider text-gris-300">VOUS GAGNEZ</p>
                    <p className="chiffres large text-h2 font-extrabold text-jaune">{c.gain}</p>
                  </div>
                </div>
                <p className="flex flex-wrap gap-2">
                  <Pastille icone={Route}>{c.distanceKm} km</Pastille>
                  <Pastille icone={Truck}>{c.vehicule}</Pastille>
                  {c.volume != null && <Pastille icone={Box}>{c.volume.toLocaleString("fr-FR")} m³</Pastille>}
                  {c.personnes > 1 && <Pastille icone={Users} accent="bg-blanc text-noir">{c.personnes} personnes</Pastille>}
                  {c.demontage && <Pastille icone={Wrench}>Démontage</Pastille>}
                  {c.express && <Pastille icone={Zap} accent="bg-jaune text-noir">Express</Pastille>}
                </p>
                <p className="text-petit text-gris-300">{c.description}</p>
                {!active && (
                  <p className="flex items-center gap-1.5 text-petit font-bold text-jaune">
                    <MapPin className="size-4" /> Voir sur la carte
                  </p>
                )}
                <form action={accepterCourse}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="bouton h-16 w-full rounded-carte text-h4" disabled={!peutAccepter}>
                    <Check className="size-6" strokeWidth={3} /> Accepter la course
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
