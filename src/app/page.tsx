import { ArrowRight, KeyRound, ShieldCheck, Store, Tag, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormulaireReservation } from "@/components/FormulaireReservation";

const ARGUMENTS = [
  { icone: Tag, titre: "Prix fixe", texte: "Calculé tout de suite, sans surprise" },
  { icone: ShieldCheck, titre: "Transporteurs vérifiés", texte: "Inscrits au registre et assurés" },
  { icone: KeyRound, titre: "Code de livraison", texte: "Remis seulement à la réception" },
];

export default async function Accueil({ searchParams }: { searchParams: Promise<{ annule?: string }> }) {
  const { annule } = await searchParams;
  return (
    <>
      <section className="relative isolate overflow-hidden bg-noir pb-32 text-blanc">
        {/* Photo de fond (public/hero.jpg) assombrie pour garder le texte lisible (contraste AA). */}
        <Image src="/hero.jpg" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-[center_40%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-noir/90 via-noir/70 to-noir/30" />
        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-14">
          <h1 className="titre max-w-3xl text-[2.25rem] leading-[1.05] sm:text-h1 lg:text-[4rem]">
            Vos marchandises livrées partout sur l&apos;île, au prix annoncé.
          </h1>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {ARGUMENTS.map(({ icone: Icone, titre, texte }) => (
              <li key={titre} className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-bouton bg-jaune text-noir">
                  <Icone className="size-5" />
                </span>
                <span>
                  <span className="block font-extrabold">{titre}</span>
                  <span className="block text-petit text-gris-300">{texte}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-24 max-w-6xl space-y-10 px-4 sm:px-6">
        {annule && (
          <p className="rounded-bouton bg-alerte-clair p-4 font-bold text-alerte">
            Paiement annulé : votre commande n&apos;a pas été validée.
          </p>
        )}
        <section id="reserver" aria-label="Réserver un transport" className="scroll-mt-4">
          <FormulaireReservation />
        </section>

        <section id="pro" className="grid scroll-mt-4 gap-5 md:grid-cols-2">
          <div className="rounded-panneau bg-jaune p-8 text-noir">
            <Store className="size-8" />
            <h2 className="titre mt-4 text-h2">Vous êtes un magasin ?</h2>
            <p className="mt-2 max-w-md">
              Livrez vos clients le jour même. Réservez en quelques secondes depuis l&apos;ordinateur de la caisse.
            </p>
            <a href="#reserver" className="bouton-noir mt-6">
              Réserver une livraison <ArrowRight className="size-4" />
            </a>
          </div>
          <div className="rounded-panneau bg-noir p-8 text-blanc">
            <Truck className="size-8 text-jaune" />
            <h2 className="titre mt-4 text-h2">Vous avez un utilitaire ?</h2>
            <p className="mt-2 max-w-md text-gris-300">
              Devenez transporteur. Choisissez vos courses, voyez le montant avant d&apos;accepter, soyez payé après chaque livraison.
            </p>
            <Link href="/transporteur" className="bouton mt-6 h-12">
              Devenir transporteur <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
