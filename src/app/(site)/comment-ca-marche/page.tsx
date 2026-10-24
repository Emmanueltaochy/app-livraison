import type { Metadata } from "next";
import { BadgeEuro, KeyRound, MapPinned, PackageCheck, ShieldCheck, Smartphone, Truck, Zap } from "lucide-react";
import { AppelReserver, Contenu, EnTetePage } from "@/components/site/Page";

export const metadata: Metadata = { title: "Comment ça marche — FretPéi" };

const ETAPES = [
  { icone: MapPinned, titre: "Décrivez votre transport", texte: "Adresses de départ et d'arrivée, objets à transporter, étages : le volume, le véhicule et le prix sont calculés tout de suite." },
  { icone: BadgeEuro, titre: "Payez le prix annoncé", texte: "Paiement sécurisé par carte. Pas de devis à attendre, pas de négociation, pas de supplément surprise." },
  { icone: Truck, titre: "Un transporteur accepte", texte: "Les transporteurs vérifiés proches de vous reçoivent la course. Vous voyez son nom, son véhicule et vous pouvez l'appeler." },
  { icone: MapPinned, titre: "Suivez en direct", texte: "Sur la carte, vous voyez le camion arriver, avec l'heure d'arrivée estimée, jusqu'à la livraison." },
  { icone: KeyRound, titre: "Donnez le code à la livraison", texte: "Vous vérifiez la marchandise, puis vous donnez votre code à 4 chiffres : c'est lui qui confirme la livraison." },
];

const GARANTIES = [
  { icone: ShieldCheck, titre: "Transporteurs vérifiés", texte: "SIRET, inscription au registre des transporteurs (DEAL Réunion) et assurance marchandises contrôlés avant activation." },
  { icone: BadgeEuro, titre: "Prix fixe", texte: "Le prix payé est celui affiché. Le transporteur connaît sa rémunération avant d'accepter." },
  { icone: PackageCheck, titre: "Paiement protégé", texte: "Le transporteur n'est payé qu'après la livraison confirmée par votre code." },
  { icone: Zap, titre: "Maintenant ou plus tard", texte: "Prise en charge dans l'heure, ou au jour et à l'heure de votre choix." },
  { icone: Smartphone, titre: "Sur ordinateur et téléphone", texte: "Les magasins réservent depuis la caisse, les particuliers depuis leur téléphone." },
];

export default function CommentCaMarche() {
  return (
    <>
      <EnTetePage surtitre="Comment ça marche" titre="Un transport réservé en 2 minutes, livré au prix annoncé." texte="Meubles, électroménager, achats en magasin, déménagement, palettes : partout sur l'île." />
      <Contenu>
        <ol className="grid gap-5 md:grid-cols-5">
          {ETAPES.map(({ icone: Icone, titre, texte }, i) => (
            <li key={titre} className="carte space-y-3">
              <span className="flex items-center gap-3">
                <span className="numero-etape">{i + 1}</span>
                <Icone className="size-6" />
              </span>
              <h2 className="text-h4 font-extrabold">{titre}</h2>
              <p className="text-petit text-gris-500">{texte}</p>
            </li>
          ))}
        </ol>
        <section className="space-y-5">
          <h2 className="titre text-h2">Vos garanties</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GARANTIES.map(({ icone: Icone, titre, texte }) => (
              <div key={titre} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-bouton bg-jaune"><Icone className="size-5" /></span>
                <div>
                  <h3 className="font-extrabold">{titre}</h3>
                  <p className="text-petit text-gris-500">{texte}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <AppelReserver />
      </Contenu>
    </>
  );
}
