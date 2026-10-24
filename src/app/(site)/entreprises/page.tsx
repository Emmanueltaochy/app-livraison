import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, FileText, Monitor, Repeat, Store, Truck } from "lucide-react";
import { AppelReserver, Contenu, EnTetePage } from "@/components/site/Page";

export const metadata: Metadata = { title: "Magasins et entreprises — FretPéi" };

const AVANTAGES = [
  { icone: Monitor, titre: "Réservez depuis la caisse", texte: "Sur l'ordinateur du magasin, en 2 minutes : adresse du client, articles, créneau. Le prix s'affiche tout de suite." },
  { icone: Clock, titre: "Livraison le jour même", texte: "« Maintenant » : un transporteur proche prend en charge dans l'heure. Ou programmez le créneau qui arrange votre client." },
  { icone: Truck, titre: "Sans flotte à gérer", texte: "Pas de camion, pas de chauffeur salarié, pas d'assurance flotte : vous payez la course, c'est tout." },
  { icone: Repeat, titre: "Suivi partagé avec votre client", texte: "Votre client reçoit le lien de suivi : il voit le camion arriver et donne son code à la réception." },
  { icone: FileText, titre: "Factures et historique", texte: "Toutes vos courses dans votre espace, avec les reçus de paiement pour la comptabilité." },
  { icone: Store, titre: "Compte professionnel", texte: "Volume régulier ? Nous ouvrons un compte pro avec une remise négociée sur le transport." },
];

export default function Entreprises() {
  return (
    <>
      <EnTetePage surtitre="Magasins et entreprises" titre="Livrez vos clients partout sur l'île, sans camion." texte="Électroménager, ameublement, bricolage, matériaux : proposez la livraison à chaque vente.">
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/#reserver" className="bouton h-14 px-6 text-h4">Réserver une livraison <ArrowRight className="size-5" /></Link>
          <Link href="/contact?sujet=compte-pro" className="flex h-14 items-center rounded-bouton border-2 border-blanc px-6 font-extrabold hover:border-jaune hover:text-jaune">Ouvrir un compte pro</Link>
        </div>
      </EnTetePage>
      <Contenu>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AVANTAGES.map(({ icone: Icone, titre, texte }) => (
            <div key={titre} className="carte space-y-3">
              <span className="flex size-11 items-center justify-center rounded-bouton bg-jaune"><Icone className="size-5" /></span>
              <h2 className="text-h4 font-extrabold">{titre}</h2>
              <p className="text-petit text-gris-500">{texte}</p>
            </div>
          ))}
        </div>
        <AppelReserver titre="Essayez sur votre prochaine vente" texte="Aucun abonnement : vous payez uniquement les courses réservées." />
      </Contenu>
    </>
  );
}
