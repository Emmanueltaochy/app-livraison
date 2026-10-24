import { ArrowRight, Building2, Hammer, KeyRound, MapPinned, ShieldCheck, Sofa, Store, Tag, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormulaireReservation } from "@/components/FormulaireReservation";
import { utilisateurCourant } from "@/lib/auth";

const ARGUMENTS = [
  { icone: Tag, titre: "Prix fixe", texte: "Calculé tout de suite, sans surprise" },
  { icone: ShieldCheck, titre: "Transporteurs vérifiés", texte: "Inscrits au registre et assurés" },
  { icone: KeyRound, titre: "Code de livraison", texte: "Remis seulement à la réception" },
];

export default async function Accueil({ searchParams }: { searchParams: Promise<{ annule?: string; client?: string }> }) {
  const { annule, client } = await searchParams;
  // Un transporteur connecté arrive directement dans son app ; « ?client=1 » lui permet de commander quand même.
  const u = await utilisateurCourant().catch(() => null);
  if (!client && u?.role === "transporteur") redirect("/transporteur");
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
        <section id="reserver" aria-label="Réserver un transport" className="scroll-mt-24">
          <FormulaireReservation client={u ? { nom: u.nom ?? "", telephone: u.telephone ?? "", email: u.email } : undefined} />
        </section>

        <section aria-labelledby="comment" className="space-y-6 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="comment" className="titre text-h2">Comment ça marche</h2>
            <Link href="/comment-ca-marche" className="flex items-center gap-1 font-bold underline">En savoir plus <ArrowRight className="size-4" /></Link>
          </div>
          <ol className="grid gap-5 md:grid-cols-3">
            {[
              { icone: Tag, titre: "Votre prix tout de suite", texte: "Adresses, objets, créneau : le véhicule et le prix sont calculés en direct." },
              { icone: MapPinned, titre: "Suivez le camion en direct", texte: "Un transporteur vérifié accepte : vous voyez son nom et son arrivée sur la carte." },
              { icone: KeyRound, titre: "Code à la livraison", texte: "Vous vérifiez la marchandise puis donnez votre code. Le transporteur est payé ensuite." },
            ].map(({ icone: Icone, titre, texte }, i) => (
              <li key={titre} className="carte flex gap-4">
                <span className="numero-etape shrink-0">{i + 1}</span>
                <div>
                  <h3 className="flex items-center gap-2 font-extrabold"><Icone className="size-5" /> {titre}</h3>
                  <p className="mt-1 text-petit text-gris-500">{texte}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="quoi" className="space-y-6">
          <h2 id="quoi" className="titre text-h2">Ce que nous transportons</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { icone: Sofa, titre: "Meubles et électroménager", texte: "Un canapé, un frigo, un achat Leboncoin" },
              { icone: Store, titre: "Livraisons magasin", texte: "Vos achats livrés le jour même" },
              { icone: Building2, titre: "Déménagements", texte: "Studio, T2 : tout le logement" },
              { icone: Hammer, titre: "Palettes et matériaux", texte: "Chantier, BTP, camion avec hayon" },
            ].map(({ icone: Icone, titre, texte }) => (
              <Link key={titre} href="/#reserver" className="carte group space-y-2 transition hover:shadow-flottante">
                <span className="flex size-11 items-center justify-center rounded-bouton bg-jaune"><Icone className="size-5" /></span>
                <h3 className="font-extrabold">{titre}</h3>
                <p className="text-petit text-gris-500">{texte}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="pro" className="grid scroll-mt-4 gap-5 md:grid-cols-2">
          <div className="rounded-panneau bg-jaune p-8 text-noir">
            <Store className="size-8" />
            <h2 className="titre mt-4 text-h2">Vous êtes un magasin ?</h2>
            <p className="mt-2 max-w-md">
              Livrez vos clients le jour même. Réservez en quelques secondes depuis l&apos;ordinateur de la caisse.
            </p>
            <Link href="/entreprises" className="bouton-noir mt-6">
              Découvrir l&apos;offre magasins <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="rounded-panneau bg-noir p-8 text-blanc">
            <Truck className="size-8 text-jaune" />
            <h2 className="titre mt-4 text-h2">Vous avez un utilitaire ?</h2>
            <p className="mt-2 max-w-md text-gris-300">
              Devenez transporteur. Choisissez vos courses, voyez le montant avant d&apos;accepter, soyez payé après chaque livraison.
            </p>
            <Link href="/devenir-transporteur" className="bouton mt-6 h-12">
              Devenir transporteur <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
