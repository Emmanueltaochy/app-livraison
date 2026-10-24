import type { Metadata } from "next";
import { AComplet } from "@/components/site/AComplet";
import { Contenu, EnTetePage, Texte } from "@/components/site/Page";
import { MARQUE } from "@/lib/config";

export const metadata: Metadata = { title: "Confidentialité — FretPéi" };

export default function Confidentialite() {
  return (
    <>
      <EnTetePage titre="Politique de confidentialité" texte="Quelles données nous collectons, pourquoi, et vos droits (RGPD)." />
      <Contenu etroit>
        <Texte>
          <h2>Responsable du traitement</h2>
          <p><AComplet>raison sociale et adresse</AComplet>.</p>
          <h2>Données collectées</h2>
          <ul>
            <li>Clients : nom, e-mail, téléphone, adresses de chargement et de livraison, description de la marchandise, historique des commandes.</li>
            <li>Transporteurs : identité, coordonnées, SIRET, numéro d&apos;inscription au registre, assurance, véhicule, et la position GPS pendant qu&apos;ils sont en ligne ou en course.</li>
            <li>Paiement : géré par Stripe ; nous ne conservons qu&apos;une référence de paiement, jamais le numéro de carte.</li>
          </ul>
          <h2>Pourquoi</h2>
          <ul>
            <li>Exécuter la commande : calcul du prix, mise en relation, suivi en direct, paiement du transporteur (exécution du contrat).</li>
            <li>Sécurité et prévention de la fraude (intérêt légitime).</li>
            <li>Obligations comptables et fiscales (obligation légale).</li>
          </ul>
          <h2>Qui y a accès</h2>
          <p>
            Le transporteur qui accepte votre course voit votre nom, votre téléphone et les adresses. Le client voit le nom, le véhicule et la position
            du transporteur pendant la course. Prestataires : Stripe (paiement), Hostinger (hébergement et e-mails), Google et Apple (notifications sur téléphone).
          </p>
          <h2>Durée de conservation</h2>
          <p>Commandes et factures : 10 ans (obligation comptable). Positions GPS des courses : 1 an. Comptes inactifs : supprimés après 3 ans.</p>
          <h2>Vos droits</h2>
          <p>
            Accès, rectification, effacement, opposition, portabilité : écrivez-nous via le <a href="/contact">formulaire de contact</a>. Vous pouvez aussi saisir la CNIL (cnil.fr).
          </p>
          <h2>Cookies</h2>
          <p>{MARQUE} n&apos;utilise qu&apos;un cookie de session, nécessaire à la connexion. Aucun cookie publicitaire ni de mesure d&apos;audience.</p>
        </Texte>
      </Contenu>
    </>
  );
}
