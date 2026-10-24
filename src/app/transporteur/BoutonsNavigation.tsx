"use client";

import { ExternalLink, Navigation } from "lucide-react";
import { useState } from "react";
import type { Point } from "@/lib/communes";
import { GuidageGPS } from "./GuidageGPS";

// Trois façons d'y aller : guidage dans l'app, ou Google Maps / Waze en dehors.
export function BoutonsNavigation({ destination, libelle }: { destination: Point; libelle: string }) {
  const [guidage, setGuidage] = useState(false);
  const { lat, lng } = destination;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setGuidage(true)} className="col-span-2 flex h-16 items-center justify-center gap-2 rounded-carte bg-jaune text-h4 font-extrabold text-noir">
          <Navigation className="size-6" /> Guidage GPS dans l&apos;app
        </button>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`}
          target="_blank"
          rel="noreferrer"
          className="flex h-14 items-center justify-center gap-2 rounded-carte border-2 border-blanc font-extrabold"
        >
          Google Maps <ExternalLink className="size-4" />
        </a>
        <a href={`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`} target="_blank" rel="noreferrer" className="flex h-14 items-center justify-center gap-2 rounded-carte border-2 border-blanc font-extrabold">
          Waze <ExternalLink className="size-4" />
        </a>
      </div>
      {guidage && <GuidageGPS destination={destination} libelle={libelle} onFermer={() => setGuidage(false)} />}
    </>
  );
}
