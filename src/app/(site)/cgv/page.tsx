import type { Metadata } from "next";
import { AComplet } from "@/components/site/AComplet";
import { Contenu, EnTetePage, Texte } from "@/components/site/Page";
import { MARQUE } from "@/lib/config";
import { TARIFS } from "@/lib/pricing";

export const metadata: Metadata = { title: "Conditions générales — FretPéi" };

export default function CGV() {
  return (
    <>
      <EnTetePage titre="Conditions générales d'utilisation et de vente" texte="Version provisoire, à faire valider par un juriste avant le lancement." />
      <Contenu etroit>
        <Texte>
          <h2>1. Objet</h2>
          <p>
            {MARQUE}, éditée par <AComplet>raison sociale</AComplet>, met en relation des clients (particuliers et professionnels) avec des transporteurs
            professionnels indépendants pour le transport de marchandises à La Réunion. Le contrat de transport est conclu entre le client et le transporteur ;
            {MARQUE} agit comme intermédiaire et encaisse le prix pour le compte du transporteur.
          </p>
          <h2>2. Commande et prix</h2>
          <p>
            Le prix est calculé avant la commande à partir des informations fournies par le client (adresses, objets, accès, créneau). Il est ferme. Le client garantit
            l&apos;exactitude de ces informations : une marchandise ou un accès non conformes peuvent entraîner le refus de la prise en charge ou un complément de prix.
          </p>
          <h2>3. Paiement</h2>
          <p>
            Le paiement s&apos;effectue par carte bancaire à la commande, via Stripe. Les frais de service ({(TARIFS.fraisServiceCts / 100).toFixed(2).replace(".", ",")} €)
            rémunèrent la plateforme. Le transporteur est payé après la livraison confirmée par le code remis au client.
          </p>
          <h2>4. Annulation</h2>
          <p>
            Annulation gratuite et remboursement intégral tant qu&apos;aucun transporteur n&apos;a accepté la course. Après acceptation : <AComplet>conditions d&apos;annulation tardive</AComplet>.
          </p>
          <h2>5. Livraison et code</h2>
          <p>
            Le client remet son code de livraison au transporteur après avoir vérifié la marchandise. La remise du code vaut réception sans réserve.
            En cas de dommage ou de manquant, le client le signale avant de remettre le code et nous contacte sous 48 h.
          </p>
          <h2>6. Marchandises exclues</h2>
          <p>Matières dangereuses, animaux vivants, denrées sous température dirigée, objets illicites, espèces et valeurs, et toute marchandise dépassant la capacité du véhicule.</p>
          <h2>7. Responsabilité et assurance</h2>
          <p>
            Les transporteurs sont inscrits au registre des transporteurs et assurés pour les marchandises transportées. Leur responsabilité est celle du contrat type
            applicable au transport routier de marchandises, sauf assurance renforcée souscrite à la commande.
          </p>
          <h2>8. Transporteurs</h2>
          <p>
            Le transporteur choisit librement ses courses. Il perçoit {100 - TARIFS.commissionTaux * 100} % du prix du transport ; la plateforme conserve une commission de
            {" "}{TARIFS.commissionTaux * 100} %. Il s&apos;engage à maintenir à jour ses documents (registre, assurance, véhicule).
          </p>
          <h2>9. Litiges</h2>
          <p>Droit français. Médiateur de la consommation : <AComplet>médiateur</AComplet>. À défaut d&apos;accord amiable, tribunaux de Saint-Denis de La Réunion.</p>
        </Texte>
      </Contenu>
    </>
  );
}
