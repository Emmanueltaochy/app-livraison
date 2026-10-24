import type { Route } from "lucide-react";

export function Pastille({ icone: Icone, children, accent }: { icone: typeof Route; children: React.ReactNode; accent?: string }) {
  return (
    <span className={`pastille ${accent ?? "bg-noir-700 text-blanc"}`}>
      <Icone className="size-4" /> {children}
    </span>
  );
}

export function Titre({ children, sousTitre }: { children: React.ReactNode; sousTitre?: string }) {
  return (
    <div>
      {sousTitre && <p className="text-gris-300">{sousTitre}</p>}
      <h1 className="titre text-h2 sm:text-h1">{children}</h1>
    </div>
  );
}
