import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeEuro, Bell, CalendarCheck, FileCheck, Navigation, ShieldCheck } from "lucide-react";
import { Contenu, EnTetePage } from "@/components/site/Page";
import { TARIFS } from "@/lib/pricing";

export const metadata: Metadata = { title: "Devenir transporteur — FretPéi" };

const POURQUOI = [
  { icone: CalendarCheck, titre: "Vous choisissez vos courses", texte: "Passez en ligne quand vous voulez. Aucune course imposée, aucun minimum." },
  { icone: BadgeEuro, titre: "Le montant avant d'accepter", texte: `Vous voyez ce que vous gagnez avant d'accepter : ${100 - TARIFS.commissionTaux * 100} % du prix du transport.` },
  { icone: ShieldCheck, titre: "Payé après chaque livraison", texte: "Le client a déjà payé. Le virement part dès que vous saisissez son code de livraison." },
  { icone: Bell, titre: "Des courses près de vous", texte: "Notification des courses immédiates dans un rayon de 40 km, et toutes les courses programmées." },
  { icone: Navigation, titre: "GPS intégré", texte: "Guidage dans l'app jusqu'au chargement puis à la livraison, ou Google Maps et Waze." },
];

const CONDITIONS = [
  "Une entreprise (SIRET), en nom propre ou en société",
  "L'inscription au registre des transporteurs (DEAL Réunion), obligatoire pour transporter pour autrui",
  "Une assurance marchandises transportées",
  "Un utilitaire : petit utilitaire, 12 m³, ou camion 20 m³ avec hayon",
  "Un smartphone (iPhone ou Android)",
];

export default function DevenirTransporteur() {
  return (
    <>
      <EnTetePage surtitre="Transporteurs" titre="Votre utilitaire, vos horaires, vos courses." texte="Rejoignez les transporteurs FretPéi et remplissez vos journées avec des courses près de chez vous.">
        <Link href="/transporteur" className="bouton mt-8 h-14 px-6 text-h4">Je m&apos;inscris <ArrowRight className="size-5" /></Link>
      </EnTetePage>
      <Contenu>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {POURQUOI.map(({ icone: Icone, titre, texte }) => (
            <div key={titre} className="carte space-y-3">
              <span className="flex size-11 items-center justify-center rounded-bouton bg-noir text-jaune"><Icone className="size-5" /></span>
              <h2 className="text-h4 font-extrabold">{titre}</h2>
              <p className="text-petit text-gris-500">{texte}</p>
            </div>
          ))}
        </div>
        <section className="grid gap-8 rounded-panneau bg-noir p-8 text-blanc md:grid-cols-2">
          <div>
            <FileCheck className="size-8 text-jaune" />
            <h2 className="titre mt-4 text-h2">Ce qu&apos;il faut pour s&apos;inscrire</h2>
            <p className="mt-2 text-gris-300">Votre dossier est vérifié avant activation, en général sous 24 h.</p>
          </div>
          <ul className="space-y-3">
            {CONDITIONS.map((c) => (
              <li key={c} className="flex gap-3"><span className="mt-2 size-2 shrink-0 rounded-full bg-jaune" />{c}</li>
            ))}
          </ul>
        </section>
        <div className="text-center">
          <Link href="/transporteur" className="bouton-noir h-14 px-8 text-h4">Créer mon compte transporteur <ArrowRight className="size-5" /></Link>
        </div>
      </Contenu>
    </>
  );
}
