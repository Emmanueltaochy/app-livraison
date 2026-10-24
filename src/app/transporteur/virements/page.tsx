import { redirect } from "next/navigation";
import { clePublique } from "@/lib/stripe";
import { exigerTransporteurValide } from "../donnees";
import { Titre } from "../Pastille";
import { InscriptionStripe } from "./InscriptionStripe";

// Activation des virements dans l'app : identité et IBAN saisis ici, vérifiés par Stripe.
export default async function Virements() {
  await exigerTransporteurValide();
  const cle = clePublique();
  if (!cle) redirect("/transporteur");
  return (
    <>
      <Titre sousTitre="Paiements sécurisés par Stripe">Activer mes virements</Titre>
      <p className="text-gris-300">Quelques informations sur vous et votre IBAN : vous serez payé après chaque livraison confirmée.</p>
      <InscriptionStripe clePublique={cle} />
    </>
  );
}
