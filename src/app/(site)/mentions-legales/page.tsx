import type { Metadata } from "next";
import { AComplet } from "@/components/site/AComplet";
import { Contenu, EnTetePage, Texte } from "@/components/site/Page";
import { MARQUE } from "@/lib/config";

export const metadata: Metadata = { title: "Mentions légales — FretPéi" };

export default function MentionsLegales() {
  return (
    <>
      <EnTetePage titre="Mentions légales" />
      <Contenu etroit>
        <Texte>
          <h2>Éditeur</h2>
          <p>
            Le site et l&apos;application {MARQUE} sont édités par <AComplet>raison sociale</AComplet>, <AComplet>forme juridique et capital</AComplet>,
            immatriculée sous le numéro <AComplet>SIREN / RCS</AComplet>, dont le siège est situé <AComplet>adresse</AComplet>, La Réunion.
            Numéro de TVA intracommunautaire : <AComplet>TVA</AComplet>.
          </p>
          <p>Directeur de la publication : <AComplet>nom</AComplet>. Contact : <a href="/contact">formulaire de contact</a>.</p>
          <h2>Hébergement</h2>
          <p>Hostinger International Ltd, 61 Lordou Vironos Street, 6023 Larnaca, Chypre — serveur privé virtuel (VPS).</p>
          <h2>Activité</h2>
          <p>
            {MARQUE} est une plateforme de mise en relation entre des clients et des transporteurs professionnels indépendants,
            inscrits au registre des transporteurs. {MARQUE} n&apos;effectue pas elle-même les transports.
          </p>
          <h2>Paiements</h2>
          <p>Les paiements sont traités par Stripe Payments Europe, Ltd. {MARQUE} ne stocke aucun numéro de carte bancaire.</p>
          <h2>Propriété intellectuelle</h2>
          <p>Les contenus du site (textes, logo, interface) sont la propriété de l&apos;éditeur. Fonds de carte © OpenStreetMap et ses contributeurs, OpenFreeMap, OpenMapTiles.</p>
        </Texte>
      </Contenu>
    </>
  );
}
