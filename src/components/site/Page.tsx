import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Gabarit des pages du site : bandeau noir avec titre, puis contenu.
export function EnTetePage({ surtitre, titre, texte, children }: { surtitre?: string; titre: string; texte?: string; children?: React.ReactNode }) {
  return (
    <section className="bg-noir pb-16 text-blanc">
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-16">
        {surtitre && <p className="text-petit font-extrabold tracking-widest text-jaune uppercase">{surtitre}</p>}
        <h1 className="titre mt-2 max-w-3xl text-[2.25rem] leading-[1.05] sm:text-h1">{titre}</h1>
        {texte && <p className="mt-4 max-w-2xl text-gris-300 sm:text-h4 sm:font-normal">{texte}</p>}
        {children}
      </div>
    </section>
  );
}

export function Contenu({ children, etroit }: { children: React.ReactNode; etroit?: boolean }) {
  return <div className={`mx-auto space-y-12 px-4 py-12 sm:px-6 ${etroit ? "max-w-3xl" : "max-w-6xl"}`}>{children}</div>;
}

export function AppelReserver({ titre = "Prêt à expédier ?", texte = "Votre prix s'affiche tout de suite, sans engagement." }: { titre?: string; texte?: string }) {
  return (
    <section className="flex flex-col items-start justify-between gap-5 rounded-panneau bg-jaune p-8 text-noir sm:flex-row sm:items-center">
      <div>
        <h2 className="titre text-h2">{titre}</h2>
        <p className="mt-1">{texte}</p>
      </div>
      <Link href="/#reserver" className="bouton-noir h-14 px-6 text-h4">
        Calculer mon prix <ArrowRight className="size-5" />
      </Link>
    </section>
  );
}

// Texte juridique ou d'aide : titres et paragraphes lisibles.
export function Texte({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 leading-relaxed [&_h2]:mt-8 [&_h2]:text-h3 [&_h2]:font-extrabold [&_li]:ml-5 [&_li]:list-disc [&_a]:font-bold [&_a]:underline">{children}</div>;
}
